import { db } from "@/db";
import { meetings, conversationMessages } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import {
  generateStructuredSummaryFromSource,
} from "./summary-generation";
import {
  createMistralSummaryCaller,
  SummaryRateLimitError,
} from "./summary-mistral";
import {
  createInsufficientSummary,
  isSummarySourceTooShort,
  type StoredMeetingSummary,
} from "./summary-schema";

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
    console.error(
      `fetchTranscriptText failed: ${error instanceof Error ? error.name : "unknown error"}`,
    );
    return null;
  }
}

/**
 * Fetch the transcript (preferred) or conversation messages (fallback) and
 * generate a validated structured summary, then persist it.
 *
 * Idempotent: by default, an existing summary is not regenerated unless a
 * richer transcript has since arrived. Pass `{ force: true }` from the
 * owner-scoped retry mutation to regenerate in the new format.
 */
export async function generateMeetingSummary(
  meetingId: string,
  options: { force?: boolean } = {},
): Promise<void> {
  const startedAt = Date.now();

  try {
    // 1. Load meeting (for transcriptUrl + existing summary/source)
    const [existing] = await db
      .select({
        summary: meetings.summary,
        summaryData: meetings.summaryData,
        summarySource: meetings.summarySource,
        transcriptUrl: meetings.transcriptUrl,
      })
      .from(meetings)
      .where(eq(meetings.id, meetingId));

    if (!existing) {
      console.log(
        JSON.stringify({ event: "summary.meeting_not_found", meetingId }),
      );
      return;
    }

    // Fetch transcript text if a transcript URL is available.
    let transcriptText: string | null = null;
    if (existing.transcriptUrl) {
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
    const hasSummary = Boolean(existing.summary || existing.summaryData);
    if (hasSummary && !options.force) {
      const canRegenerate =
        transcriptText &&
        existing.summarySource !== "transcript" &&
        existing.summarySource !== "merged";
      if (!canRegenerate) {
        console.log(
          JSON.stringify({ event: "summary.skipped_existing", meetingId }),
        );
        return;
      }
      console.log(
        JSON.stringify({ event: "summary.regenerate_with_transcript", meetingId }),
      );
    }

    // 2. Fetch all conversation messages for this meeting (fallback source)
    const messages = await db
      .select()
      .from(conversationMessages)
      .where(eq(conversationMessages.meetingId, meetingId))
      .orderBy(asc(conversationMessages.createdAt));

    const conversationText =
      messages.length > 0
        ? messages
            .map((m) => `${m.role === "user" ? "User" : "AI"}: ${m.content}`)
            .join("\n")
        : "";

    // 3. Build the source string passed to the LLM.
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

    // 4. Empty/tiny sources never reach the model. Store a clear, validated
    // "not enough conversation" state instead of hallucinating content.
    if (isSummarySourceTooShort(source)) {
      const data = createInsufficientSummary();
      await db
        .update(meetings)
        .set({
          summary: data.overview,
          summaryData: data,
          summaryError: null,
          summarySource: sourceLabel,
        })
        .where(eq(meetings.id, meetingId));

      console.log(
        JSON.stringify({
          event: "summary.insufficient",
          meetingId,
          sourceChars: source.length,
          transcriptChars: transcriptText?.length ?? 0,
          conversationChars: conversationText.length,
          ms: Date.now() - startedAt,
        }),
      );
      return;
    }

    // 5. Call Mistral in JSON mode. The output is still validated by zod;
    // JSON mode only guarantees syntactically valid JSON, not our schema.
    if (!process.env.MISTRAL_API_KEY) {
      throw new Error("Missing MISTRAL_API_KEY in environment variables.");
    }

    const model = process.env.MODEL_NAME || "mistral-small-latest";

    const callModel = createMistralSummaryCaller({
      meetingId,
      model,
      apiKey: process.env.MISTRAL_API_KEY,
    });

    const result = await generateStructuredSummaryFromSource({
      source,
      callModel,
    });

    // 6. Persist only validated (or explicitly flagged fallback) data.
    const data: StoredMeetingSummary = result.data;
    await db
      .update(meetings)
      .set({
        summary: data.overview,
        summaryData: data,
        summaryError: null,
        summarySource: sourceLabel,
      })
      .where(eq(meetings.id, meetingId));

    console.log(
      JSON.stringify({
        event: "summary.generated",
        meetingId,
        source: sourceLabel,
        sourceChars: source.length,
        transcriptChars: transcriptText?.length ?? 0,
        conversationChars: conversationText.length,
        attempts: result.attempts,
        usedFallback: result.usedFallback,
        validationErrors: result.validationErrors.length,
        ms: Date.now() - startedAt,
      }),
    );
  } catch (error) {
    // Log with context; record the failure on the meeting so the UI can show a
    // "Summary failed - retry" state instead of hanging forever.
    const message =
      error instanceof SummaryRateLimitError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Summary generation failed.";
    console.error(
      JSON.stringify({
        event: "summary.error",
        meetingId,
        errorName: error instanceof Error ? error.name : "UnknownError",
        message,
        ms: Date.now() - startedAt,
      }),
    );
    try {
      await db
        .update(meetings)
        .set({ summaryError: message })
        .where(eq(meetings.id, meetingId));
    } catch (dbError) {
      console.error(
        JSON.stringify({
          event: "summary.error_persist_failed",
          meetingId,
          errorName: dbError instanceof Error ? dbError.name : "UnknownError",
        }),
      );
    }
  }
}
