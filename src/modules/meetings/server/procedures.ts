import { db } from "@/db";
import { meetings, agents, activities, voiceInteractions, user } from "@/db/schema";
import { createTRPCRouter, protectedProcedure, rateLimited } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { meetingsInsertSchema, meetingsUpdateSchema } from "../schemas";
import { z } from "zod";
import { eq, and, desc, count, ilike, sql } from "drizzle-orm";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from "@/constants";
import { meetingStatus as meetingStatusEnum } from "@/db/schema";
import { streamVideo } from "@/lib/stream-video";
import { after } from "next/server";
import { LIMITS } from "@/lib/limits";
import { AGENT_TEMPLATE_IDS, getAgentTemplate } from "@/lib/agent-templates";
import { checkLimit, getRemainingLimit } from "@/lib/rate-limit";

/**
 * Extract safe diagnostics from a Stream SDK error. The SDK throws
 * `StreamError` with:
 * - `metadata.responseCode`: the HTTP status of the failed request
 * - `code`: the Stream API error code (e.g. 12)
 * - `message`: "Stream error code <code>: <api message>" (no PII)
 * The message is truncated and only the name is kept for unknown errors.
 */
export function describeStreamError(error: unknown): {
  httpStatus: number | null;
  errorCode: number | null;
  message: string;
} {
  const truncated = (value: string) => value.slice(0, 200);
  if (error && typeof error === "object" && "metadata" in error) {
    const streamError = error as {
      metadata?: { responseCode?: number };
      code?: number;
      message?: unknown;
    };
    return {
      httpStatus:
        typeof streamError.metadata?.responseCode === "number"
          ? streamError.metadata.responseCode
          : null,
      errorCode: typeof streamError.code === "number" ? streamError.code : null,
      message: truncated(
        typeof streamError.message === "string" ? streamError.message : "",
      ),
    };
  }
  return {
    httpStatus: null,
    errorCode: null,
    message: truncated(
      error instanceof Error ? `${error.name}: ${error.message}` : "unknown error",
    ),
  };
}

import { generateMeetingSummary } from "@/lib/meeting-summary";

export const meetingsRouter = createTRPCRouter({
  getSession: protectedProcedure.query(async ({ ctx }) => {
    const [userData] = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      })
      .from(user)
      .where(eq(user.id, ctx.userId));

    if (!userData) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found.",
      });
    }

    return { user: userData };
  }),

  getToken: protectedProcedure
    .use(rateLimited("getToken.hour"))
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify the meeting belongs to the caller before issuing a call-scoped
      // token. Return NOT_FOUND (not FORBIDDEN) so meeting IDs can't be probed.
      const [meeting] = await db
        .select({ id: meetings.id })
        .from(meetings)
        .where(and(eq(meetings.id, input.id), eq(meetings.userId, ctx.userId)));

      if (!meeting) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Meeting not found.",
        });
      }

      const expiration = Math.floor(Date.now() / 1000) + 3600; // 1 hour
      const issuedAt = Math.floor(Date.now() / 1000) - 60; // 1 minute ago
      // Issue a call-scoped token restricted to this meeting's call cid, so a
      // token leaked for one meeting cannot be used to join another.
      return streamVideo.generateCallToken({
        user_id: ctx.userId,
        call_cids: [`default:${input.id}`],
        exp: expiration,
        iat: issuedAt,
      });
    }),

  createCall: protectedProcedure
    .use(rateLimited("createCall.hour"))
    .use(rateLimited("createCall.day"))
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [meeting] = await db
        .select()
        .from(meetings)
        .where(and(eq(meetings.id, input.id), eq(meetings.userId, ctx.userId)));

      if (!meeting) {
        throw new Error("Meeting not found");
      }

      const call = streamVideo.video.call("default", meeting.id);

      try {
        const response = await call.getOrCreate({
          data: {
            created_by_id: ctx.userId,
            // Explicitly scope the call to its owner so other authenticated users
            // cannot join even if they know the meeting id.
            members: [{ user_id: ctx.userId, role: "admin" }],
            settings_override: {
              recording: {
                mode: "available",
                quality: "720p",
              },
              transcription: {
                // "available" only makes the feature *available*; the transcript
                // must be started explicitly via startTranscription(). "auto-on"
                // starts transcription automatically when the first participant
                // joins and stops it when all participants leave, and the
                // call.transcription_ready webhook fires with the file URL.
                mode: "auto-on",
              },
              limits: {
                max_duration_seconds: LIMITS.stream.callMaxDurationMinutes * 60,
                max_participants: 4,
              },
            },
          },
        });

        // Verify Stream actually accepted the transcription settings: the
        // response echoes the effective call settings back.
        const effectiveMode = response.call.settings.transcription?.mode;
        console.log(
          JSON.stringify({
            event: "transcription.settings_applied",
            meetingId: meeting.id,
            requestedMode: "auto-on",
            effectiveMode: effectiveMode ?? "unknown",
            matchesRequested: effectiveMode === "auto-on",
            transcribing: response.call.transcribing,
          }),
        );
      } catch (error) {
        // If Stream rejects the settings (or the call creation), surface the
        // rejection with safe diagnostics so misconfiguration is visible
        // instead of silently producing transcript-less calls.
        const details = describeStreamError(error);
        console.error(
          JSON.stringify({
            event: "transcription.settings_rejected",
            meetingId: meeting.id,
            requestedMode: "auto-on",
            httpStatus: details.httpStatus,
            errorCode: details.errorCode,
            message: details.message,
          }),
        );
        // Call creation itself failed — keep the previous behavior so the
        // call flow surfaces the error as before.
        throw error;
      }

      if (meeting.status === "scheduled") {
        await db
          .update(meetings)
          .set({
            status: "ongoing",
            startedAt: new Date(),
          })
          .where(eq(meetings.id, meeting.id));

        await db.insert(activities).values({
          userId: ctx.userId,
          type: "meeting_started",
          title: `Meeting Started: ${meeting.name}`,
          description: `The meeting "${meeting.name}" has successfully started with an AI agent.`,
        });
      }

      return {
        id: meeting.id,
        type: "default",
      };
    }),

  getRecordings: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [meeting] = await db
        .select({ id: meetings.id })
        .from(meetings)
        .where(and(eq(meetings.id, input.id), eq(meetings.userId, ctx.userId)));

      if (!meeting) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Meeting not found.",
        });
      }

      const call = streamVideo.video.call("default", input.id);
      const { recordings } = await call.listRecordings();
      return recordings;
    }),

  getTranscriptions: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [meeting] = await db
        .select({ id: meetings.id })
        .from(meetings)
        .where(and(eq(meetings.id, input.id), eq(meetings.userId, ctx.userId)));

      if (!meeting) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Meeting not found.",
        });
      }

      const call = streamVideo.video.call("default", input.id);
      const { transcriptions } = await call.listTranscriptions();
      return transcriptions;
    }),

  getMany: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(DEFAULT_PAGE),
        pageSize: z.number().min(1).max(100).default(DEFAULT_PAGE_SIZE),
        search: z.string().nullish(),
        status: z.string().nullish(),
        agentId: z.string().nullish(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize, search, status, agentId } = input;
      const offset = (page - 1) * pageSize;

      const filters = [eq(meetings.userId, ctx.userId)];

      if (search && search.trim() !== "") {
        filters.push(ilike(meetings.name, `%${search}%`));
      }

      if (status && status !== "" && status !== "all") {
        // Only apply status filter if it's one of the valid statuses
        if ((meetingStatusEnum as readonly string[]).includes(status)) {
          filters.push(
            eq(meetings.status, status as (typeof meetingStatusEnum)[number])
          );
        }
      }

      if (agentId && agentId !== "" && agentId !== "all") {
        filters.push(eq(meetings.agentId, agentId));
      }

      const whereClause = and(...filters);

      const dataPromise = db
        .select({
          id: meetings.id,
          name: meetings.name,
          agentId: meetings.agentId,
          agentName: agents.name,
          status: meetings.status,
          startedAt: meetings.startedAt,
          endedAt: meetings.endedAt,
          duration: sql<number | null>`CASE WHEN ${meetings.endedAt} IS NOT NULL AND ${meetings.startedAt} IS NOT NULL AND ${meetings.endedAt} >= ${meetings.startedAt} THEN EXTRACT(EPOCH FROM (${meetings.endedAt} - ${meetings.startedAt})) / 60 ELSE NULL END`,
          createdAt: meetings.createdAt,
        })
        .from(meetings)
        .innerJoin(agents, eq(meetings.agentId, agents.id))
        .where(whereClause)
        .orderBy(desc(meetings.createdAt))
        .limit(pageSize)
        .offset(offset);

      const countPromise = db
        .select({ total: count() })
        .from(meetings)
        .where(whereClause);

      const [data, [totalCount]] = await Promise.all([
        dataPromise,
        countPromise,
      ]);

      const total = totalCount.total;

      return {
        data,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }),

  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [meeting] = await db
        .select({
          id: meetings.id,
          name: meetings.name,
          agentId: meetings.agentId,
          agentName: agents.name,
          instructions: meetings.instructions,
          status: meetings.status,
          startedAt: meetings.startedAt,
          endedAt: meetings.endedAt,
          duration: sql<number | null>`CASE WHEN ${meetings.endedAt} IS NOT NULL AND ${meetings.startedAt} IS NOT NULL AND ${meetings.endedAt} >= ${meetings.startedAt} THEN EXTRACT(EPOCH FROM (${meetings.endedAt} - ${meetings.startedAt})) / 60 ELSE NULL END`,
          transcriptUrl: meetings.transcriptUrl,
          summary: meetings.summary,
          summaryData: meetings.summaryData,
          summaryError: meetings.summaryError,
          summarySource: meetings.summarySource,
          recordingUrl: meetings.recordingUrl,
          createdAt: meetings.createdAt,
        })
        .from(meetings)
        .innerJoin(agents, eq(meetings.agentId, agents.id))
        .where(and(eq(meetings.id, input.id), eq(meetings.userId, ctx.userId)));

      return meeting || null;
    }),

  create: protectedProcedure
    .input(meetingsInsertSchema)
    .mutation(async ({ ctx, input }) => {
      // Quota check (count-then-insert; small race acceptable on neon-http).
      const [existing] = await db
        .select({ total: count() })
        .from(meetings)
        .where(eq(meetings.userId, ctx.userId));

      if ((existing?.total ?? 0) >= LIMITS.quotas.maxMeetingsPerUser) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `You reached the limit of ${LIMITS.quotas.maxMeetingsPerUser} meetings. Delete one to create another.`,
        });
      }

      const [newMeeting] = await db
        .insert(meetings)
        .values({
          ...input,
          userId: ctx.userId,
        })
        .returning();

      await db.insert(activities).values({
        userId: ctx.userId,
        type: "meeting_created",
        title: `Meeting Scheduled: ${newMeeting.name}`,
        description: `A new meeting "${newMeeting.name}" has been scheduled.`,
      });

      return newMeeting;
    }),

  /**
   * One-click "Try it now": reuses (or creates) the agent for a template and
   * schedules an immediate meeting, then the client navigates to the call page.
   * The client sends only a templateId; all template text is looked up here.
   */
  quickStart: protectedProcedure
    .use(rateLimited("quickStart.hour"))
    .input(z.object({ templateId: z.enum(AGENT_TEMPLATE_IDS) }))
    .mutation(async ({ ctx, input }) => {
      const template = getAgentTemplate(input.templateId);
      if (!template) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Unknown agent template.",
        });
      }

      // Check the meeting quota first: if it is full, do not create an agent
      // that cannot be used for the meeting we are about to schedule.
      const [meetingCount] = await db
        .select({ total: count() })
        .from(meetings)
        .where(eq(meetings.userId, ctx.userId));

      if ((meetingCount?.total ?? 0) >= LIMITS.quotas.maxMeetingsPerUser) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `You reached the limit of ${LIMITS.quotas.maxMeetingsPerUser} meetings. Delete one to create another.`,
        });
      }

      // Reuse an agent with exactly the template name (newest first). Its
      // instruction is never overwritten because the user may have edited it.
      const [existingAgent] = await db
        .select({ id: agents.id })
        .from(agents)
        .where(and(eq(agents.userId, ctx.userId), eq(agents.name, template.name)))
        .orderBy(desc(agents.createdAt))
        .limit(1);

      let agentId = existingAgent?.id;
      let reusedAgent = Boolean(existingAgent);

      if (!agentId) {
        // Agent quota check (count-then-insert; same as agents.create).
        const [agentCount] = await db
          .select({ total: count() })
          .from(agents)
          .where(eq(agents.userId, ctx.userId));

        if ((agentCount?.total ?? 0) >= LIMITS.quotas.maxAgentsPerUser) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `You reached the limit of ${LIMITS.quotas.maxAgentsPerUser} agents. Delete one to create another.`,
          });
        }

        const [newAgent] = await db
          .insert(agents)
          .values({
            name: template.name,
            instruction: template.instruction,
            userId: ctx.userId,
          })
          .returning();

        agentId = newAgent.id;
        reusedAgent = false;

        await db.insert(activities).values({
          userId: ctx.userId,
          type: "agent_created",
          title: `Agent Created: ${newAgent.name}`,
          description: `A new AI agent "${newAgent.name}" has been deployed to your workspace from a template.`,
        });
      }

      let meetingId: string;
      try {
        const [insertedMeeting] = await db
          .insert(meetings)
          .values({
            name: template.suggestedMeetingName,
            agentId,
            userId: ctx.userId,
            instructions: null,
            status: "scheduled",
          })
          .returning({ id: meetings.id });

        meetingId = insertedMeeting.id;
      } catch {
        // neon-http has no interactive transactions, so the agent created
        // above (if any) stays. Log only ids, never template text.
        console.error(
          JSON.stringify({
            event: "meetings.quickStart.meeting_insert_failed",
            userId: ctx.userId,
            templateId: input.templateId,
            outcome: "meeting_insert_failed",
          }),
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not start your session. Please try again.",
        });
      }

      await db.insert(activities).values({
        userId: ctx.userId,
        type: "meeting_created",
        title: `Meeting Scheduled: ${template.suggestedMeetingName}`,
        description: `A new meeting "${template.suggestedMeetingName}" has been scheduled.`,
      });

      return { meetingId, agentId, reusedAgent };
    }),

  update: protectedProcedure
    .input(meetingsUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [updatedMeeting] = await db
        .update(meetings)
        .set(data)
        .where(and(eq(meetings.id, id), eq(meetings.userId, ctx.userId)))
        .returning();

      if (updatedMeeting && data.status === "completed") {
         await db.insert(activities).values({
            userId: ctx.userId,
            type: "meeting_completed",
            title: `Meeting Completed: ${updatedMeeting.name}`,
            description: `Meeting "${updatedMeeting.name}" has ended. AI is now processing recordings and transcripts.`,
         });
      }

      return updatedMeeting || null;
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [deletedMeeting] = await db
        .delete(meetings)
        .where(and(eq(meetings.id, input.id), eq(meetings.userId, ctx.userId)))
        .returning();
      return deletedMeeting || null;
    }),

  /**
   * Log a voice interaction for the dashboard metrics.
   * Called from the client after each user→AI exchange completes.
   */
  logVoiceInteraction: protectedProcedure
    .use(rateLimited("logVoiceInteraction.hour"))
    .input(z.object({
      meetingId: z.string(),
      duration: z.string().optional(),
      responseTime: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [meeting] = await db
        .select({ id: meetings.id })
        .from(meetings)
        .where(and(eq(meetings.id, input.meetingId), eq(meetings.userId, ctx.userId)));

      if (!meeting) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Meeting not found.",
        });
      }

      await db.insert(voiceInteractions).values({
        userId: ctx.userId,
        meetingId: input.meetingId,
        duration: input.duration ?? null,
        responseTime: input.responseTime ?? null,
      });
      return { success: true };
    }),

  /**
   * End a call and trigger AI summary generation from the client side.
   * This provides a reliable fallback when the Stream webhook cannot reach
   * the dev server (no ngrok). Safe to call even if the webhook also fires
   * — it skips if the meeting is already in "completed" status.
   */
  endCall: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // 1. Fetch the current meeting (validate ownership + check status)
      const [meeting] = await db
        .select()
        .from(meetings)
        .where(and(eq(meetings.id, input.id), eq(meetings.userId, ctx.userId)));

      if (!meeting) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Meeting not found.",
        });
      }

      // 2. Guard: if already completed, skip to avoid double-processing
      if (meeting.status === "completed") {
        console.log(`Meeting ${input.id} already completed, skipping endCall.`);
        return meeting;
      }

      // 3. Update status to completed + set endedAt
      const [updatedMeeting] = await db
        .update(meetings)
        .set({
          status: "completed",
          endedAt: new Date(),
        })
        .where(and(eq(meetings.id, input.id), eq(meetings.userId, ctx.userId)))
        .returning();

      // 4. Log activity (fire-and-forget, consistent with existing patterns)
      await db.insert(activities).values({
        userId: ctx.userId,
        type: "meeting_completed",
        title: `Meeting Completed: ${meeting.name}`,
        description: `Meeting "${meeting.name}" has ended. AI is now processing recordings and transcripts.`,
      });

      // 5. Attempt to fetch recording + transcription URLs from Stream
      //    (they may not be ready immediately — fail silently if not available)
      try {
        const streamCall = streamVideo.video.call("default", input.id);
        // 5a. Best-effort explicit stop so the transcription file is finalized
        //     even if a call member stays connected after "end call".
        //     With mode "auto-on" Stream already stops when everyone leaves;
        //     calling stop here simply short-circuits that wait. Harmless if
        //     transcription is not running (error is swallowed below).
        const stopResult = await streamCall
          .stopTranscription()
          .then(
            () =>
              JSON.stringify({
                event: "transcription.stop_requested",
                meetingId: input.id,
              }),
            (error: unknown) =>
              JSON.stringify({
                event: "transcription.stop_skipped",
                meetingId: input.id,
                errorName: error instanceof Error ? error.name : "unknown error",
                ...describeStreamError(error),
              }),
          );
        console.log(stopResult);

        const [recordingsResult, transcriptionsResult] = await Promise.allSettled([
          streamCall.listRecordings(),
          streamCall.listTranscriptions(),
        ]);

        const recordingUrl =
          recordingsResult.status === "fulfilled" && recordingsResult.value.recordings.length > 0
            ? recordingsResult.value.recordings[0].url
            : undefined;

        const transcriptUrl =
          transcriptionsResult.status === "fulfilled" && transcriptionsResult.value.transcriptions.length > 0
            ? transcriptionsResult.value.transcriptions[0].url
            : undefined;

        if (recordingUrl || transcriptUrl) {
          await db
            .update(meetings)
            .set({
              ...(recordingUrl && { recordingUrl }),
              ...(transcriptUrl && { transcriptUrl }),
            })
            .where(and(eq(meetings.id, input.id), eq(meetings.userId, ctx.userId)));
        }
      } catch {
        // Non-blocking — recording/transcription URLs may not be ready yet
        console.log(`Stream artifacts not yet available for meeting ${input.id}.`);
      }

      // 6. Trigger summary generation after the response is sent so it doesn't
      // block endCall, while keeping the work alive on serverless runtimes.
      after(() => {
        void generateMeetingSummary(input.id, { trigger: "endCall" });
      });

      return updatedMeeting;
    }),

  /**
   * Manually retry summary generation for a completed meeting. Owner-scoped.
   * Quota: hourly cap on ATTEMPTS (pre-consumed), daily cap on
   * non-provider-failure retries per meeting (consumed only when outcome is
   * not provider_busy).
   */
  retrySummary: protectedProcedure
    .use(rateLimited("retrySummary.hour"))
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [meeting] = await db
        .select({ id: meetings.id })
        .from(meetings)
        .where(and(eq(meetings.id, input.id), eq(meetings.userId, ctx.userId)));

      if (!meeting) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Meeting not found.",
        });
      }

      const dailyKey = `${ctx.userId}:${input.id}`;
      const daily = await getRemainingLimit("retrySummary.dayPerMeeting", dailyKey);
      if (!daily.allowed) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "You have reached today's retry limit for this meeting. Try again later.",
        });
      }

      await db
        .update(meetings)
        .set({ summaryError: null })
        .where(and(eq(meetings.id, input.id), eq(meetings.userId, ctx.userId)));

      const result = await generateMeetingSummary(input.id, {
        force: true,
        trigger: "retry",
      });

      // Do not charge daily non-provider-failure quota for provider_busy.
      if (result.outcome !== "provider_busy") {
        await checkLimit("retrySummary.dayPerMeeting", dailyKey);
      }

      return { success: true, outcome: result.outcome };
    }),
});