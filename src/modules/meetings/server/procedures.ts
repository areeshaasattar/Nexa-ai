import { db } from "@/db";
import { meetings, agents, activities, conversationMessages, voiceInteractions } from "@/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { meetingsInsertSchema, meetingsUpdateSchema } from "../schemas";
import { z } from "zod";
import { eq, and, desc, count, or, ilike, sql } from "drizzle-orm";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from "@/constants";
import { meetingStatus as meetingStatusEnum } from "@/db/schema";
import { streamVideo } from "@/lib/stream-video";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

import { generateMeetingSummary } from "@/lib/meeting-summary";

export const meetingsRouter = createTRPCRouter({
  getSession: protectedProcedure.query(async () => {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    return session;
  }),

  getToken: protectedProcedure.query(async ({ ctx }) => {
    const expiration = Math.floor(Date.now() / 1000) + 3600; // 1 hour
    const issuedAt = Math.floor(Date.now() / 1000) - 60; // 1 minute ago
    return streamVideo.generateUserToken({
      user_id: ctx.userId,
      exp: expiration,
      iat: issuedAt,
    });
  }),

  createCall: protectedProcedure
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

      await call.getOrCreate({
        data: {
          created_by_id: ctx.userId,
          settings_override: {
            recording: {
              mode: "available",
              quality: "720p",
            },
            transcription: {
              mode: "available",
            },
          },
        },
      });

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
      const call = streamVideo.video.call("default", input.id);
      const { recordings } = await call.listRecordings();
      return recordings;
    }),

  getTranscriptions: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
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
        if (meetingStatusEnum.includes(status as any)) {
          filters.push(eq(meetings.status, status as any));
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
          duration: sql<number>`EXTRACT(EPOCH FROM (${meetings.endedAt} - ${meetings.startedAt})) / 60`,
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
          duration: sql<number>`EXTRACT(EPOCH FROM (${meetings.endedAt} - ${meetings.startedAt})) / 60`,
          transcriptUrl: meetings.transcriptUrl,
          summary: meetings.summary,
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

  saveMessage: protectedProcedure
    .input(z.object({
      meetingId: z.string(),
      role: z.enum(["user", "ai"]),
      content: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const [message] = await db
          .insert(conversationMessages)
          .values({
            meetingId: input.meetingId,
            role: input.role,
            content: input.content,
          })
          .returning();
        return message;
      } catch (error) {
        console.error("saveMessage mutation error:", {
          error,
          meetingId: input.meetingId,
          role: input.role,
          contentLength: input.content.length,
          userId: ctx.userId,
        });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to save message: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Log a voice interaction for the dashboard metrics.
   * Called from the client after each user→AI exchange completes.
   */
  logVoiceInteraction: protectedProcedure
    .input(z.object({
      meetingId: z.string(),
      duration: z.string().optional(),
      responseTime: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await db.insert(voiceInteractions).values({
        userId: ctx.userId,
        meetingId: input.meetingId,
        duration: input.duration ?? null,
        responseTime: input.responseTime ?? null,
        accuracy: "95", // placeholder — no real accuracy measurement available
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
        .where(eq(meetings.id, input.id))
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
            .where(eq(meetings.id, input.id));
        }
      } catch {
        // Non-blocking — recording/transcription URLs may not be ready yet
        console.log(`Stream artifacts not yet available for meeting ${input.id}.`);
      }

      // 6. Trigger summary generation (fire-and-forget — has its own try/catch)
      generateMeetingSummary(input.id);

      return updatedMeeting;
    }),
});
