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
import { parseStreamTranscript } from "./transcript-parser";
import { user } from "@/db/schema";

const TRANSCRIPT_CHAR_CAP = 12000;

/**
 * Fetch a Stream transcription file and parse it with the pure Stream JSONL
 * parser. speaker_id values are Stream user ids; they are mapped to display
 * names via knownUsers (currently the meeting owner).
 */
async function fetchTranscriptText(
  url: string,
  knownUsers: Record<string, string>,
): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const raw = await res.text();

    const parsed = parseStreamTranscript(raw, knownUsers);
    if (!parsed) {
      console.log(
        JSON.stringify({ event: "summary.transcript_parse_failed", urlLength: url.length }),
      );
      return null;
    }
    return parsed.text;
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
    // 1. Load meeting (for transcriptUrl + existing summary/source + owner)
    const [existing] = await db
      .select({
        userId: meetings.userId,
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

    // Map Stream user ids (transcript speaker_id) to display names. The only
    // guaranteed Stream member is the meeting owner; other human members
    // would need to be added to this map when member management exists.
    const [owner] = await db
      .select({ id: user.id, name: user.name })
      .from(user)
      .where(eq(user.id, existing.userId));
    const knownUsers: Record<string, string> = owner
      ? { [owner.id]: owner.name }
      : {};

    // Fetch transcript text if a transcript URL is available.
    let transcriptText: string | null = null;
    if (existing.transcriptUrl) {
      transcriptText = await fetchTranscriptText(
        existing.transcriptUrl,
        knownUsers,
      );
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
