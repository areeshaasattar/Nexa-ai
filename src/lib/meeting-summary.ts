import { db } from "@/db";
import { meetings, conversationMessages } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

const TRANSCRIPT_CHAR_CAP = 12000;

/**
 * Best-effort fetch + parse of a Stream transcription file into a plain-text,
 * speaker-labeled transcript. Returns null when the file can't be fetched or
 * parsed. The format varies (JSON array, JSONL, or plain text), so we try a
 * few shapes and fall back to the raw body.
 */
async function fetchTranscriptText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const raw = await res.text();
    if (!raw.trim()) return null;

    // Try JSON first.
    try {
      const json = JSON.parse(raw);
      const segments: unknown[] = Array.isArray(json)
        ? json
        : Array.isArray((json as { segments?: unknown[] })?.segments)
          ? (json as { segments: unknown[] }).segments
          : Array.isArray((json as { transcript?: unknown[] })?.transcript)
            ? (json as { transcript: unknown[] }).transcript
            : Array.isArray((json as { results?: unknown[] })?.results)
              ? (json as { results: unknown[] }).results
              : [];

      if (segments.length > 0) {
        const lines = segments
          .map((s) => {
            const obj = s as Record<string, unknown>;
            const speaker =
              (obj.speaker as string) ||
              (obj.speaker_name as string) ||
              (obj.participant as string) ||
              (obj.user as string) ||
              (obj.name as string) ||
              "Speaker";
            const text =
              (obj.text as string) ||
              (obj.transcript as string) ||
              (obj.content as string) ||
              (obj.value as string) ||
              "";
            return text ? `${speaker}: ${text}` : null;
          })
          .filter(Boolean) as string[];
        if (lines.length > 0) return lines.join("\n");
      }
    } catch {
      // Not JSON; try JSONL below.
    }

    // Try JSONL.
    const jsonlLines = raw
      .split(/\n+/)
      .map((l) => l.trim())
      .filter(Boolean);
    const parsedJsonl: string[] = [];
    let allJson = true;
    for (const line of jsonlLines) {
      try {
        const obj = JSON.parse(line) as Record<string, unknown>;
        const speaker =
          (obj.speaker as string) ||
          (obj.speaker_name as string) ||
          (obj.participant as string) ||
          (obj.user as string) ||
          (obj.name as string) ||
          "Speaker";
        const text =
          (obj.text as string) ||
          (obj.transcript as string) ||
          (obj.content as string) ||
          (obj.value as string) ||
          "";
        if (text) parsedJsonl.push(`${speaker}: ${text}`);
      } catch {
        allJson = false;
        break;
      }
    }
    if (allJson && parsedJsonl.length > 0) {
      return parsedJsonl.join("\n");
    }

    // Fall back to raw text.
    return raw;
  } catch (error) {
    console.error(`fetchTranscriptText failed for ${url}:`, error);
    return null;
  }
}

/**
 * Fetch conversation messages for a meeting and call the Mistral API to
 * generate a concise 3-5 sentence summary, then persist it on the meeting record.
 *
 * Idempotent: if `meetings.summary` is already set for the given meeting, the
 * function returns early without re-generating. This makes it safe to call
 * from both the client-side `endCall` mutation AND the Stream webhook
 * `call.session_ended` handler — whichever fires first writes the summary,
 * the second call is a no-op.
 */
export async function generateMeetingSummary(meetingId: string): Promise<void> {
  try {
    // 1. Load meeting (for transcriptUrl + existing summary/source)
    const [existing] = await db
      .select({
        summary: meetings.summary,
        summarySource: meetings.summarySource,
        transcriptUrl: meetings.transcriptUrl,
      })
      .from(meetings)
      .where(eq(meetings.id, meetingId));

    // Fetch transcript text if a transcript URL is available.
    let transcriptText: string | null = null;
    if (existing?.transcriptUrl) {
      transcriptText = await fetchTranscriptText(existing.transcriptUrl);
      if (transcriptText && transcriptText.length > TRANSCRIPT_CHAR_CAP) {
        transcriptText =
          transcriptText.slice(0, TRANSCRIPT_CHAR_CAP) +
          "\n[transcript truncated]";
      }
    }

    // Idempotency: skip if a summary already exists, unless the previous one
    // came only from the conversation fallback and a transcript is now
    // available (allow regeneration from the richer source).
    if (existing?.summary) {
      const canRegenerate =
        transcriptText &&
        existing.summarySource !== "transcript" &&
        existing.summarySource !== "merged";
      if (!canRegenerate) {
        console.log(`Summary already exists for meeting ${meetingId}, skipping re-generation.`);
        return;
      }
      console.log(`Regenerating summary for meeting ${meetingId} using transcript.`);
    }

    // 2. Fetch all conversation messages for this meeting (fallback source)
    const messages = await db
      .select()
      .from(conversationMessages)
      .where(eq(conversationMessages.meetingId, meetingId))
      .orderBy(asc(conversationMessages.createdAt));

    const conversationText =
      messages.length > 0
        ? messages.map((m) => `${m.role === "user" ? "User" : "AI"}: ${m.content}`).join("\n")
        : "";

    // 3. If neither source has content, skip (leave summary null)
    if (!transcriptText && !conversationText) {
      console.log(`No content for meeting ${meetingId}, skipping summary.`);
      return;
    }

    // 4. Build the source string passed to the LLM.
    let source: string;
    let sourceLabel: "transcript" | "conversation" | "merged";
    if (transcriptText && conversationText) {
      source = `Human conversation transcript:\n${transcriptText}\n\nAI assistant conversation:\n${conversationText}`;
      sourceLabel = "merged";
    } else if (transcriptText) {
      source = transcriptText;
      sourceLabel = "transcript";
    } else {
      source = conversationText;
      sourceLabel = "conversation";
    }

    // 5. Call Mistral API
    if (!process.env.MISTRAL_API_KEY) {
      throw new Error("Missing MISTRAL_API_KEY in environment variables.");
    }

    const model = process.env.MODEL_NAME || "mistral-small-latest";

    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.MISTRAL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "Summarize this conversation between a user and an AI agent in 3-5 concise sentences, " +
              "highlighting the main topics discussed and any conclusions or action items. " +
              "Write in plain prose, no markdown formatting, no headings.",
          },
          { role: "user", content: source },
        ],
      }),
    });

    if (response.status === 429) {
      console.warn(
        `Mistral rate limit prevented summary generation for meeting ${meetingId}.`,
      );
      await db
        .update(meetings)
        .set({ summaryError: "AI provider rate-limited; retry later." })
        .where(eq(meetings.id, meetingId));
      return;
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Mistral Error: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    const summaryText: string =
      data.choices?.[0]?.message?.content ||
      "Conversation recorded but summary could not be generated.";

    // 6. Persist the summary on the meeting record
    await db
      .update(meetings)
      .set({ summary: summaryText, summaryError: null, summarySource: sourceLabel })
      .where(eq(meetings.id, meetingId));

    console.log(`Summary generated for meeting ${meetingId}.`);
  } catch (error) {
    // Log with context; record the failure on the meeting so the UI can show a
    // "Summary failed - retry" state instead of hanging forever.
    const message = error instanceof Error ? error.message : String(error);
    console.error(`generateMeetingSummary error for meeting ${meetingId}:`, error);
    try {
      await db
        .update(meetings)
        .set({ summaryError: message })
        .where(eq(meetings.id, meetingId));
    } catch (dbError) {
      console.error(`Failed to record summary error for meeting ${meetingId}:`, dbError);
    }
  }
}
