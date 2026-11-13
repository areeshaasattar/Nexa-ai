import { and, eq, isNull } from "drizzle-orm";
import { meetings, user } from "@/db/schema";
import { sendEmail, maskEmail } from "@/lib/email";
import { summaryEmail } from "@/lib/email-templates";
import {
  storedSummaryDataSchema,
  type StoredMeetingSummary,
} from "@/lib/summary-schema";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export type SummaryEmailSkipReason =
  | "meeting_not_found"
  | "user_not_found"
  | "already_sent"
  | "opted_out"
  | "missing_summary"
  | "invalid_summary"
  | "not_normal_kind"
  | "empty_content"
  | "too_old";

export type SummaryEmailDecision =
  | { action: "skip"; reason: SummaryEmailSkipReason }
  | { action: "send" };

export function hasMeaningfulSummaryContent(
  data: Pick<StoredMeetingSummary, "overview" | "decisions" | "actionItems" | "topics" | "openQuestions">,
): boolean {
  const overview = data.overview?.trim() ?? "";
  return (
    overview.length > 0 ||
    (data.decisions?.length ?? 0) > 0 ||
    (data.actionItems?.length ?? 0) > 0 ||
    (data.topics?.length ?? 0) > 0 ||
    (data.openQuestions?.length ?? 0) > 0
  );
}

export function decideSummaryEmail(input: {
  meeting: {
    summaryEmailSentAt: Date | null;
    endedAt: Date | null;
    summaryData: unknown;
  } | null;
  owner: {
    email: string | null;
    summaryEmailsEnabled: boolean | null | undefined;
  } | null;
  now?: Date;
}): SummaryEmailDecision {
  const { meeting, owner, now = new Date() } = input;
  if (!meeting) return { action: "skip", reason: "meeting_not_found" };
  if (!owner || !owner.email) return { action: "skip", reason: "user_not_found" };
  if (meeting.summaryEmailSentAt) return { action: "skip", reason: "already_sent" };
  if (owner.summaryEmailsEnabled === false) return { action: "skip", reason: "opted_out" };

  if (meeting.endedAt) {
    const ageMs = now.getTime() - new Date(meeting.endedAt).getTime();
    if (ageMs > TWENTY_FOUR_HOURS_MS) {
      return { action: "skip", reason: "too_old" };
    }
  }

  if (!meeting.summaryData) return { action: "skip", reason: "missing_summary" };

  // Explicit empty-content check on raw data (even if schema would reject it).
  if (typeof meeting.summaryData === "object" && meeting.summaryData !== null) {
    const raw = meeting.summaryData as Record<string, unknown>;
    const overview = typeof raw.overview === "string" ? raw.overview.trim() : "";
    const emptyLists =
      Array.isArray(raw.decisions) && raw.decisions.length === 0 &&
      Array.isArray(raw.actionItems) && raw.actionItems.length === 0 &&
      Array.isArray(raw.topics) && raw.topics.length === 0 &&
      Array.isArray(raw.openQuestions) && raw.openQuestions.length === 0;
    if (overview.length === 0 && emptyLists) {
      return { action: "skip", reason: "empty_content" };
    }
  }

  const parsed = storedSummaryDataSchema.safeParse(meeting.summaryData);
  if (!parsed.success) return { action: "skip", reason: "invalid_summary" };

  const kind = parsed.data.meta?.kind ?? "structured";
  if (kind !== "structured") return { action: "skip", reason: "not_normal_kind" };

  if (!hasMeaningfulSummaryContent(parsed.data)) {
    return { action: "skip", reason: "empty_content" };
  }

  return { action: "send" };
}

function getBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.BETTER_AUTH_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

function formatDuration(startedAt: Date | null, endedAt: Date | null): string | null {
  if (!startedAt || !endedAt) return null;
  const ms = endedAt.getTime() - startedAt.getTime();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return "under 1 min";
  if (minutes === 1) return "1 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  if (rem === 0) return hours === 1 ? "1 hr" : `${hours} hrs`;
  return `${hours} hr ${rem} min`;
}

function logOutcome(payload: Record<string, unknown>) {
  const level = payload.outcome === "error" ? console.error : console.log;
  level(JSON.stringify({ event: "summary_email", ...payload }));
}

export async function maybeSendSummaryEmail(meetingId: string): Promise<void> {
  try {
    const { db } = await import("@/db");

    const [row] = await db
      .select({
        meetingId: meetings.id,
        meetingName: meetings.name,
        meetingUserId: meetings.userId,
        startedAt: meetings.startedAt,
        endedAt: meetings.endedAt,
        summaryData: meetings.summaryData,
        summaryEmailSentAt: meetings.summaryEmailSentAt,
        ownerEmail: user.email,
        ownerName: user.name,
        summaryEmailsEnabled: user.summaryEmailsEnabled,
      })
      .from(meetings)
      .innerJoin(user, eq(meetings.userId, user.id))
      .where(eq(meetings.id, meetingId))
      .limit(1);

    if (!row) {
      // Meeting deleted or missing (join would also miss if user missing).
      // Distinguish user-not-found best-effort: try meeting-only lookup.
      const [meetingOnly] = await db
        .select({ id: meetings.id })
        .from(meetings)
        .where(eq(meetings.id, meetingId))
        .limit(1);
      logOutcome({
        outcome: "skipped",
        reason: meetingOnly ? "user_not_found" : "meeting_not_found",
        meetingId,
      });
      return;
    }

    const decision = decideSummaryEmail({
      meeting: {
        summaryEmailSentAt: row.summaryEmailSentAt ?? null,
        endedAt: row.endedAt ?? null,
        summaryData: row.summaryData,
      },
      owner: {
        email: row.ownerEmail,
        summaryEmailsEnabled: row.summaryEmailsEnabled,
      },
    });

    if (decision.action === "skip") {
      logOutcome({
        outcome: "skipped",
        reason: decision.reason,
        meetingId,
        userId: row.meetingUserId,
      });
      return;
    }

    const parsed = storedSummaryDataSchema.safeParse(row.summaryData);
    if (!parsed.success) {
      logOutcome({
        outcome: "skipped",
        reason: "invalid_summary",
        meetingId,
        userId: row.meetingUserId,
      });
      return;
    }
    const data = parsed.data;

    // Claim atomically BEFORE sending.
    const claimed = await db
      .update(meetings)
      .set({ summaryEmailSentAt: new Date() })
      .where(
        and(eq(meetings.id, meetingId), isNull(meetings.summaryEmailSentAt)),
      )
      .returning({ id: meetings.id });

    if (claimed.length === 0) {
      logOutcome({
        outcome: "skipped",
        reason: "already_sent",
        meetingId,
        userId: row.meetingUserId,
      });
      return;
    }

    const baseUrl = getBaseUrl();
    const meetingUrl = `${baseUrl}/meetings/${meetingId}`;
    const settingsUrl = `${baseUrl}/settings?tab=account`;

    const template = summaryEmail({
      name: row.ownerName,
      meetingName: row.meetingName,
      durationText: formatDuration(row.startedAt, row.endedAt),
      overview: data.overview ?? "",
      decisions: data.decisions ?? [],
      actionItems: data.actionItems ?? [],
      topics: data.topics ?? [],
      openQuestions: data.openQuestions ?? [],
      meetingUrl,
      settingsUrl,
    });

    const result = await sendEmail({
      to: row.ownerEmail!,
      ...template,
      template: "meeting_summary",
      devLink: meetingUrl,
    });

    if (!result.ok) {
      try {
        await db
          .update(meetings)
          .set({ summaryEmailSentAt: null })
          .where(eq(meetings.id, meetingId));
      } catch (releaseError) {
        logOutcome({
          outcome: "error",
          reason: "claim_release_failed",
          meetingId,
          userId: row.meetingUserId,
          error: releaseError instanceof Error ? releaseError.message : "unknown",
        });
      }

      const failureReason =
        result.error === "daily_email_budget_exceeded"
          ? "budget_exceeded"
          : "send_failed";

      logOutcome({
        outcome: "skipped",
        reason: failureReason,
        meetingId,
        userId: row.meetingUserId,
        to: maskEmail(row.ownerEmail!),
        sendError: result.error,
        sendStatus: result.status,
      });
      return;
    }

    logOutcome({
      outcome: "sent",
      meetingId,
      userId: row.meetingUserId,
      to: maskEmail(row.ownerEmail!),
      messageId: result.messageId,
    });
  } catch (error) {
    logOutcome({
      outcome: "error",
      meetingId,
      reason: "unexpected_error",
      errorName: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : "unknown",
    });
  }
}
