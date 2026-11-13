import { db } from "@/db";
import { meetings, conversationMessages, user } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { generateStructuredSummaryFromSource } from "./summary-generation";
import {
  createInsufficientSummary,
  isSummarySourceTooShort,
  type StoredMeetingSummary,
} from "./summary-schema";
import { parseStreamTranscript } from "./transcript-parser";
import { maybeSendSummaryEmail } from "./summary-email";
import {
  SUMMARY_ENDCALL_INITIAL_DELAY_MS,
  sleep,
  waitForChatQuietPeriod,
} from "./mistral-activity";

const TRANSCRIPT_CHAR_CAP = 12000;
export const SUMMARY_PROVIDER_BUSY_CODE = "provider_busy";

export type SummaryGenerationOutcome =
  | "generated"
  | "insufficient"
  | "provider_busy"
  | "skipped"
  | "not_found"
  | "error";

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
        JSON.stringify({
          event: "summary.transcript_parse_failed",
          urlLength: url.length,
        }),
      );
      return null;
    }
    return parsed.text;
  } catch {
    console.error(
      JSON.stringify({
        event: "summary.transcript_fetch_failed",
      }),
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
  options: { force?: boolean; trigger?: "endCall" | "webhook" | "retry" } = {},
): Promise<{ outcome: SummaryGenerationOutcome }> {
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
      return { outcome: "not_found" };
    }

    // Map Stream user ids (transcript speaker_id) to display names.
    const [owner] = await db
      .select({ id: user.id, name: user.name })
      .from(user)
      .where(eq(user.id, existing.userId));
    const knownUsers: Record<string, string> = owner
      ? { [owner.id]: owner.name }
      : {};

    // Soft serialization (best-effort, in-process): avoid overlapping with
    // recent chat provider activity for the same user. For endCall, also
    // delay the first attempt by ~3s.
    await waitForChatQuietPeriod(existing.userId);
    if (options.trigger === "endCall") {
      await sleep(SUMMARY_ENDCALL_INITIAL_DELAY_MS);
    }

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

    // Idempotency: skip if a summary already exists, unless a richer transcript
    // has since arrived or force is set.
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
        return { outcome: "skipped" };
      }
      console.log(
        JSON.stringify({
          event: "summary.regenerate_with_transcript",
          meetingId,
        }),
      );
    }

    // 2. Fetch conversation messages (fallback source)
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

    // 4. Empty/tiny sources never reach the model.
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
      return { outcome: "insufficient" };
    }

    // 5. Call LLM with provider backoff/retries and a shared attempt budget.
    // Mistral is primary; on limit/quota/rate-limit failures the summary caller
    // can fall back to Groq when GROQ_API_KEY is configured.
    const mistralApiKey = process.env.MISTRAL_API_KEY?.trim();
    const groqApiKey = process.env.GROQ_API_KEY?.trim();
    if (!mistralApiKey && !groqApiKey) {
      throw new Error("missing_llm_api_key");
    }
    const model = process.env.MODEL_NAME || "mistral-small-latest";

    const result = await generateStructuredSummaryFromSource({
      source,
      meetingId,
      model,
      apiKey: mistralApiKey || groqApiKey || "",
    });

    if (result.status === "provider_busy") {
      await db
        .update(meetings)
        .set({ summaryError: SUMMARY_PROVIDER_BUSY_CODE })
        .where(eq(meetings.id, meetingId));

      console.warn(
        JSON.stringify({
          event: "summary.provider_busy_final",
          meetingId,
          source: sourceLabel,
          attempts: result.providerAttempts,
          validationAttempts: result.validationAttempts,
          ms: Date.now() - startedAt,
        }),
      );
      // Transient state: keep summaryData untouched and do NOT trigger summary email.
      return { outcome: "provider_busy" };
    }

    // 6. Persist only validated (or explicitly flagged fallback) data.
    const data: StoredMeetingSummary = result.data!;
    await db
      .update(meetings)
      .set({
        summary: data.overview,
        summaryData: data,
        summaryError: null,
        summarySource: sourceLabel,
      })
      .where(eq(meetings.id, meetingId));

    // Email only for stored, valid, normal summaries (hook decides).
    void maybeSendSummaryEmail(meetingId).catch(() => {});

    console.log(
      JSON.stringify({
        event: "summary.generated",
        meetingId,
        source: sourceLabel,
        sourceChars: source.length,
        transcriptChars: transcriptText?.length ?? 0,
        conversationChars: conversationText.length,
        attempts: result.providerAttempts,
        validationAttempts: result.validationAttempts,
        usedFallback: result.usedFallback,
        validationErrors: result.validationErrors.length,
        ms: Date.now() - startedAt,
      }),
    );
    return { outcome: "generated" };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "summary_generation_failed";
    console.error(
      JSON.stringify({
        event: "summary.error",
        meetingId,
        errorName: error instanceof Error ? error.name : "UnknownError",
        code: message,
        ms: Date.now() - startedAt,
      }),
    );
    try {
      await db
        .update(meetings)
        .set({ summaryError: message.slice(0, 200) })
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
    return { outcome: "error" };
  }
}
