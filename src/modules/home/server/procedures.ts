import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { z } from "zod";
import { db } from "@/db";
import { meetings, agents, activities, voiceInteractions, user } from "@/db/schema";
import { count, eq, and, desc, gte, lt, sql, avg, sum } from "drizzle-orm";
import { subDays } from "date-fns";

export const homeRouter = createTRPCRouter({
  hello: protectedProcedure
    .input(z.object({ text: z.string() }))
    .query(async ({ ctx }) => {
      const [userData] = await db
        .select()
        .from(user)
        .where(eq(user.id, ctx.userId));
        
      return {
        greeting: `Welcome, ${userData?.name || "User"}`,
        user: userData
      };
    }),

  getDashboardData: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.userId;
    const now = new Date();
    const sevenDaysAgo = subDays(now, 7);
    const fourteenDaysAgo = subDays(now, 14);

    // 1. Meeting Statistics
    const [meetingsStats] = await db
      .select({
        total: count(),
        completed: count(sql`CASE WHEN ${meetings.status} = 'completed' THEN 1 END`),
        ongoing: count(sql`CASE WHEN ${meetings.status} = 'ongoing' THEN 1 END`),
        scheduled: count(sql`CASE WHEN ${meetings.status} = 'scheduled' THEN 1 END`),
        cancelled: count(sql`CASE WHEN ${meetings.status} = 'cancelled' THEN 1 END`),
        avgDuration: avg(sql`EXTRACT(EPOCH FROM (${meetings.endedAt} - ${meetings.startedAt})) / 60`),
        totalDuration: sum(sql`EXTRACT(EPOCH FROM (${meetings.endedAt} - ${meetings.startedAt})) / 60`),
      })
      .from(meetings)
      .where(eq(meetings.userId, userId));

    const [thisWeekMeetings] = await db
      .select({ total: count() })
      .from(meetings)
      .where(and(eq(meetings.userId, userId), gte(meetings.createdAt, sevenDaysAgo)));

    const [prevWeekMeetings] = await db
      .select({ total: count() })
      .from(meetings)
      .where(and(eq(meetings.userId, userId), gte(meetings.createdAt, fourteenDaysAgo), lt(meetings.createdAt, sevenDaysAgo)));

    // 2. Agent Statistics
    const [agentsStats] = await db
      .select({
        total: count(),
      })
      .from(agents)
      .where(eq(agents.userId, userId));

    const mostUsedAgentPromise = db
      .select({
        agentId: meetings.agentId,
        agentName: agents.name,
        count: count(),
      })
      .from(meetings)
      .innerJoin(agents, eq(meetings.agentId, agents.id))
      .where(eq(meetings.userId, userId))
      .groupBy(meetings.agentId, agents.name)
      .orderBy(desc(count()))
      .limit(1);

    // 3. Voice Statistics (from voiceInteractions table)
    const [voiceStats] = await db
      .select({
        totalCalls: count(),
        avgResponseTime: avg(sql`CAST(${voiceInteractions.responseTime} AS FLOAT)`),
      })
      .from(voiceInteractions)
      .where(eq(voiceInteractions.userId, userId));

    // 4. Recording/Transcription Statistics
    const [recordingStats] = await db
      .select({
        totalRecordings: count(sql`CASE WHEN ${meetings.recordingUrl} IS NOT NULL THEN 1 END`),
        totalTranscriptions: count(sql`CASE WHEN ${meetings.transcriptUrl} IS NOT NULL THEN 1 END`),
      })
      .from(meetings)
      .where(eq(meetings.userId, userId));

    // 5. Activity Feed
    const recentActivities = await db
      .select()
      .from(activities)
      .where(eq(activities.userId, userId))
      .orderBy(desc(activities.createdAt))
      .limit(10);

    // 6. Upcoming Meetings
    const upcomingMeetings = await db
      .select({
        id: meetings.id,
        name: meetings.name,
        status: meetings.status,
        startedAt: meetings.startedAt,
        createdAt: meetings.createdAt,
        agentName: agents.name,
      })
      .from(meetings)
      .innerJoin(agents, eq(meetings.agentId, agents.id))
      .where(and(eq(meetings.userId, userId), eq(meetings.status, "scheduled")))
      .orderBy(meetings.createdAt)
      .limit(5);

    // 7. Chart Data (Last 7 days)
    const chartData = await db.execute(sql`
      SELECT 
        DATE_TRUNC('day', created_at) as date,
        COUNT(*) as count
      FROM meetings
      WHERE user_id = ${userId} AND created_at >= ${sevenDaysAgo}
      GROUP BY date
      ORDER BY date ASC
    `);

    const durationChartData = await db.execute(sql`
      SELECT
        DATE_TRUNC('day', created_at) as date,
        AVG(EXTRACT(EPOCH FROM (${meetings.endedAt} - ${meetings.startedAt})) / 60) as avg_duration
      FROM meetings
      WHERE user_id = ${userId}
        AND created_at >= ${sevenDaysAgo}
        AND started_at IS NOT NULL
        AND ended_at IS NOT NULL
      GROUP BY date
      ORDER BY date ASC
    `);

    const [mostUsedAgent] = await mostUsedAgentPromise;

    const thisWeekTotal = Number(thisWeekMeetings.total);
    const prevWeekTotal = Number(prevWeekMeetings.total);
    const meetingTrend =
      prevWeekTotal > 0
        ? Math.round(((thisWeekTotal - prevWeekTotal) / prevWeekTotal) * 100)
        : 0;

    return {
      metrics: {
        meetings: {
          total: Number(meetingsStats.total),
          completed: Number(meetingsStats.completed),
          ongoing: Number(meetingsStats.ongoing),
          scheduled: Number(meetingsStats.scheduled),
          cancelled: Number(meetingsStats.cancelled),
          avgDuration: Math.round(Number(meetingsStats.avgDuration) || 0),
          totalHours: Math.round((Number(meetingsStats.totalDuration) || 0) / 60),
          trend: meetingTrend,
        },
        agents: {
          total: Number(agentsStats.total),
          active: Number(agentsStats.total),
          mostUsed: mostUsedAgent?.agentName || "None",
        },
        voice: {
          totalConversations: Number(voiceStats.totalCalls),
          responseTime: Math.round(Number(voiceStats.avgResponseTime) || 0),
        },
        recordings: {
          total: Number(recordingStats.totalRecordings),
          transcriptions: Number(recordingStats.totalTranscriptions),
        }
      },
      upcomingMeetings,
      recentActivities,
      chartData: (chartData.rows as unknown as { date: Date | string; count: number | string }[]).map(
        (row) => ({
          date: new Date(row.date).toLocaleDateString('en-US', { weekday: 'short' }),
          count: Number(row.count)
        })
      ),
      durationChart: (durationChartData.rows as unknown as { date: Date | string; avg_duration: number | string }[]).map(
        (row) => ({
          date: new Date(row.date).toLocaleDateString('en-US', { weekday: 'short' }),
          count: Math.round(Number(row.avg_duration) || 0),
        })
      ),
    };
  }),

  getOverview: protectedProcedure
    .input(z.object({ range: z.enum(["7d", "30d", "12m"]) }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.userId;
      const range = input.range;
      const now = new Date();

      // Period boundaries (UTC).
      const days = range === "7d" ? 7 : range === "30d" ? 30 : 365;
      const isMonth = range === "12m";
      const currentStart = isMonth
        ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1))
        : new Date(now.getTime() - days * 86400000);
      const previousStart = isMonth
        ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 23, 1))
        : new Date(currentStart.getTime() - days * 86400000);

      // Total counts.
      const [meetingsTotal] = await db
        .select({ c: count() })
        .from(meetings)
        .where(eq(meetings.userId, userId));
      const [agentsTotal] = await db
        .select({ c: count() })
        .from(agents)
        .where(eq(agents.userId, userId));
      const [summariesTotal] = await db
        .select({ c: count() })
        .from(meetings)
        .where(and(eq(meetings.userId, userId), sql`${meetings.summaryData} IS NOT NULL`));
      const [voiceTotal] = await db
        .select({ c: count() })
        .from(voiceInteractions)
        .where(eq(voiceInteractions.userId, userId));

      // Status breakdown (all time).
      const statusRows = await db
        .select({ status: meetings.status, c: count() })
        .from(meetings)
        .where(eq(meetings.userId, userId))
        .groupBy(meetings.status);

      // Most used agent.
      const mostUsedRows = await db
        .select({ agentId: meetings.agentId, agentName: agents.name, c: count() })
        .from(meetings)
        .innerJoin(agents, eq(meetings.agentId, agents.id))
        .where(eq(meetings.userId, userId))
        .groupBy(meetings.agentId, agents.name)
        .orderBy(desc(count()))
        .limit(1);

      // Recent meetings (5).
      const recentRows = await db
        .select({
          id: meetings.id,
          name: meetings.name,
          status: meetings.status,
          startedAt: meetings.startedAt,
          endedAt: meetings.endedAt,
          createdAt: meetings.createdAt,
          agentId: meetings.agentId,
          agentName: agents.name,
          summaryData: meetings.summaryData,
          recordingUrl: meetings.recordingUrl,
        })
        .from(meetings)
        .innerJoin(agents, eq(meetings.agentId, agents.id))
        .where(eq(meetings.userId, userId))
        .orderBy(desc(meetings.createdAt))
        .limit(5);

      // Upcoming (scheduled, 5).
      const upcomingRows = await db
        .select({
          id: meetings.id,
          name: meetings.name,
          status: meetings.status,
          startedAt: meetings.startedAt,
          createdAt: meetings.createdAt,
          agentId: meetings.agentId,
          agentName: agents.name,
        })
        .from(meetings)
        .innerJoin(agents, eq(meetings.agentId, agents.id))
        .where(and(eq(meetings.userId, userId), eq(meetings.status, "scheduled")))
        .orderBy(meetings.createdAt)
        .limit(5);

      // Completed without summary + oldest.
      const completedNoSummaryRows = await db
        .select({ id: meetings.id, createdAt: meetings.createdAt })
        .from(meetings)
        .where(
          and(
            eq(meetings.userId, userId),
            eq(meetings.status, "completed"),
            sql`${meetings.summaryData} IS NULL`,
          ),
        )
        .orderBy(meetings.createdAt)
        .limit(1);
      const [completedNoSummaryCount] = await db
        .select({ c: count() })
        .from(meetings)
        .where(
          and(
            eq(meetings.userId, userId),
            eq(meetings.status, "completed"),
            sql`${meetings.summaryData} IS NULL`,
          ),
        );

      // Scheduled count.
      const [scheduledCountRow] = await db
        .select({ c: count() })
        .from(meetings)
        .where(and(eq(meetings.userId, userId), eq(meetings.status, "scheduled")));

      // Last call date.
      const [lastCallRow] = await db
        .select({ d: sql<Date | null>`MAX(${meetings.startedAt})` })
        .from(meetings)
        .where(eq(meetings.userId, userId));

      // Voice response times (parse defensively).
      const voiceRows = await db
        .select({ responseTime: voiceInteractions.responseTime })
        .from(voiceInteractions)
        .where(eq(voiceInteractions.userId, userId));

      // Meetings by day/month for current + previous period.
      const periodStart = previousStart;
      const meetingsPeriodRows = await db
        .select({
          date: isMonth
            ? sql<string>`to_char(date_trunc('month', ${meetings.createdAt}), 'YYYY-MM')`
            : sql<string>`to_char(date_trunc('day', ${meetings.createdAt}), 'YYYY-MM-DD')`,
          c: count(),
        })
        .from(meetings)
        .where(and(eq(meetings.userId, userId), gte(meetings.createdAt, periodStart)))
        .groupBy(
          isMonth
            ? sql`date_trunc('month', ${meetings.createdAt})`
            : sql`date_trunc('day', ${meetings.createdAt})`,
        );

      const voicePeriodRows = await db
        .select({
          date: isMonth
            ? sql<string>`to_char(date_trunc('month', ${voiceInteractions.createdAt}), 'YYYY-MM')`
            : sql<string>`to_char(date_trunc('day', ${voiceInteractions.createdAt}), 'YYYY-MM-DD')`,
          c: count(),
        })
        .from(voiceInteractions)
        .where(and(eq(voiceInteractions.userId, userId), gte(voiceInteractions.createdAt, periodStart)))
        .groupBy(
          isMonth
            ? sql`date_trunc('month', ${voiceInteractions.createdAt})`
            : sql`date_trunc('day', ${voiceInteractions.createdAt})`,
        );

      // Split current vs previous.
      const currentMeetingRows: { date: string; count: number }[] = [];
      const previousMeetingCount = meetingsPeriodRows.reduce((acc, r) => {
        const d = new Date(r.date + (isMonth ? "-01" : ""));
        if (d >= currentStart) {
          currentMeetingRows.push({ date: r.date, count: Number(r.c) });
          return acc;
        }
        return acc + Number(r.c);
      }, 0);

      const currentVoiceRows: { date: string; count: number }[] = [];
      const previousVoiceCount = voicePeriodRows.reduce((acc, r) => {
        const d = new Date(r.date + (isMonth ? "-01" : ""));
        if (d >= currentStart) {
          currentVoiceRows.push({ date: r.date, count: Number(r.c) });
          return acc;
        }
        return acc + Number(r.c);
      }, 0);

      // current counts from total? recompute current counts from rows


      // avg reply ms
      let replySum = 0;
      let replyN = 0;
      for (const r of voiceRows) {
        const n = Number(r.responseTime);
        if (Number.isFinite(n)) {
          replySum += n;
          replyN += 1;
        }
      }
      const avgReplyMs = replyN > 0 ? replySum / replyN : null;

      // status breakdown
      const statusMap = { completed: 0, ongoing: 0, scheduled: 0 };
      for (const r of statusRows) {
        if (r.status in statusMap) statusMap[r.status as keyof typeof statusMap] = Number(r.c);
      }

      const mostUsed = mostUsedRows[0]
        ? { name: mostUsedRows[0].agentName, count: Number(mostUsedRows[0].c) }
        : null;

      const recentMeetings = recentRows.map((m) => ({
        id: m.id,
        name: m.name,
        status: m.status,
        startedAt: m.startedAt ? m.startedAt.toISOString() : null,
        endedAt: m.endedAt ? m.endedAt.toISOString() : null,
        createdAt: m.createdAt.toISOString(),
        agentId: m.agentId,
        agentName: m.agentName,
        hasSummary: m.summaryData != null,
        recordingUrl: m.recordingUrl,
      }));

      const upcomingMeetings = upcomingRows.map((m) => ({
        id: m.id,
        name: m.name,
        status: m.status,
        startedAt: m.startedAt ? m.startedAt.toISOString() : null,
        createdAt: m.createdAt.toISOString(),
        agentId: m.agentId,
        agentName: m.agentName,
      }));

      return {
        totals: {
          meetings: Number(meetingsTotal?.c ?? 0),
          agents: Number(agentsTotal?.c ?? 0),
          summariesReady: Number(summariesTotal?.c ?? 0),
          voiceInteractions: Number(voiceTotal?.c ?? 0),
          avgReplyMs,
        },
        previous: {
          meetings: previousMeetingCount,
          summariesReady: 0, // not trended separately
          voiceInteractions: previousVoiceCount,
        },
        range,
        series: { meetings: currentMeetingRows, voice: currentVoiceRows },
        statusBreakdown: statusMap,
        mostUsedAgent: mostUsed,
        recentMeetings,
        upcomingMeetings,
        insights: {
          completedWithoutSummary: Number(completedNoSummaryCount?.c ?? 0),
          oldestCompletedWithoutSummaryId: completedNoSummaryRows[0]?.id ?? null,
          scheduledCount: Number(scheduledCountRow?.c ?? 0),
          lastCallDate: lastCallRow?.d ? new Date(lastCallRow.d).toISOString() : null,
          hasAgent: Number(agentsTotal?.c ?? 0) > 0,
        },
      };
    }),

  getRecentActivity: protectedProcedure.query(async ({ ctx }) => {
    const rows = await db
      .select({
        id: activities.id,
        type: activities.type,
        title: activities.title,
        description: activities.description,
        createdAt: activities.createdAt,
      })
      .from(activities)
      .where(eq(activities.userId, ctx.userId))
      .orderBy(desc(activities.createdAt))
      .limit(10);
    return rows.map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      description: r.description,
      createdAt: r.createdAt.toISOString(),
    }));
  }),

  getOnboarding: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.userId;

    const [agentCountRow] = await db
      .select({ count: count() })
      .from(agents)
      .where(eq(agents.userId, userId));

    const [meetingCountRow] = await db
      .select({ count: count() })
      .from(meetings)
      .where(eq(meetings.userId, userId));

    const [joinedRow] = await db
      .select({ count: count() })
      .from(meetings)
      .where(
        and(
          eq(meetings.userId, userId),
          sql`(${meetings.startedAt} IS NOT NULL OR ${meetings.status} IN ('ongoing','completed'))`,
        ),
      );

    const [summaryRow] = await db
      .select({ count: count() })
      .from(meetings)
      .where(and(eq(meetings.userId, userId), sql`${meetings.summaryData} IS NOT NULL`));

    const [firstMeeting] = await db
      .select({ id: meetings.id })
      .from(meetings)
      .where(eq(meetings.userId, userId))
      .orderBy(meetings.createdAt)
      .limit(1);

    const agentCount = Number(agentCountRow?.count ?? 0);
    const meetingCount = Number(meetingCountRow?.count ?? 0);
    const hasJoinedCall = Number(joinedRow?.count ?? 0) > 0;
    const hasSummary = Number(summaryRow?.count ?? 0) > 0;

    return {
      agentCount,
      meetingCount,
      hasJoinedCall,
      hasSummary,
      firstMeetingId: firstMeeting?.id ?? null,
    };
  }),

  getSystemHealth: protectedProcedure.query(async () => {
    const start = Date.now();

    // `as const` keeps the literal "online" | "offline" union so it satisfies
    // StatusMonitor's StatusItem["status"] (string would widen and not match).
    const dbStatus = await db
      .select({ one: sql`1` })
      .from(user)
      .limit(1)
      .then(() => "online" as const)
      .catch(() => "offline" as const);
    const dbLatency = Date.now() - start;

    const services: { name: string; status: "online" | "offline"; latency: string }[] = [
      { name: "Neon Database", status: dbStatus, latency: `${dbLatency}ms` },
    ];

    // Optional services: report configured/not-configured without external calls.
    services.push({
      name: "Brevo (email)",
      status:
        process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL
          ? "online"
          : "offline",
      latency:
        process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL
          ? "configured"
          : "not configured",
    });
    services.push({
      name: "Upstash (rate limit)",
      status:
        process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
          ? "online"
          : "offline",
      latency:
        process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
          ? "configured"
          : "not configured",
    });
    services.push({
      name: "Sentry",
      status: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN ? "online" : "offline",
      latency:
        process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN ? "configured" : "not configured",
    });
    const primaryLlmName =
      process.env.LLM_PRIMARY?.trim().toLowerCase() === "groq" ? "groq" : "mistral";
    const primaryLlmConfigured =
      primaryLlmName === "groq"
        ? Boolean(process.env.GROQ_API_KEY?.trim() && process.env.GROQ_MODEL_NAME?.trim())
        : Boolean(process.env.MISTRAL_API_KEY?.trim());
    services.push({
      name: `Primary LLM (${primaryLlmName})`,
      status: primaryLlmConfigured ? "online" : "offline",
      latency: primaryLlmConfigured ? "configured" : "not configured",
    });
    services.push({
      name: "Fallback LLM (Groq)",
      status: process.env.GROQ_API_KEY && process.env.GROQ_MODEL_NAME ? "online" : "offline",
      latency:
        process.env.GROQ_API_KEY && process.env.GROQ_MODEL_NAME
          ? "configured"
          : "not configured",
    });

    return { services };
  })
});
