// src/modules/home/ui/views/home-view.tsx
"use client";

import { motion } from "framer-motion";
import {
  Video,
  Bot,
  Mic,
  Calendar as CalendarIcon,
  FileAudio,
  Zap,
  History,
  ArrowUpRight,
  Activity,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { MetricCard } from "../components/metric-card";
import { AnalyticsChart } from "../components/analytics-chart";
import { HeroSection } from "../components/hero-section";
import { MeetingCard } from "../components/meeting-card";
import { ActivityTimeline } from "../components/activity-timeline";
import { InsightCard } from "../components/insight-card";
import { StatusMonitor } from "../components/status-monitor";
import { QuickActionCard } from "../components/quick-action-card";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { NewMeetingDialog } from "@/modules/meetings/ui/components/new-meeting-dialog";
import { useDashboard } from "@/hooks/useDashboard";
import { cn } from "@/lib/utils";

// ─── animation variants ───────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      delay: i * 0.07,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  }),
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

// ─── section wrapper ──────────────────────────────────────────────────────────

function Section({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.section
      variants={fadeUp}
      initial="hidden"
      animate="show"
      className={cn("w-full", className)}
    >
      {children}
    </motion.section>
  );
}

// ─── section header (compact SaaS typography) ────────────────────────────────

function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="space-y-0.5">
        <h2 className="text-sm font-semibold tracking-tight text-slate-900">
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs text-slate-500">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

// ─── chart / sparkline data helpers ──────────────────────────────────────────

const WEEK_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Align the server's sparse Mon–Sun counts into a fixed Mon..Sun array,
// zero-filling days with no meetings so the line never looks broken.
function normalizeWeekly(
  chartData: { date: string; count: number }[]
): { labels: string[]; counts: number[] } {
  const byDay: Record<string, number> = {};
  for (const d of chartData) byDay[d.date] = d.count;
  const counts = WEEK_LABELS.map((label) => byDay[label] ?? 0);
  return { labels: WEEK_LABELS, counts };
}

// Realistic demo curve shown when the real counts are too sparse to chart
// (user requested sensible placeholder data rather than a broken flat line).
const DEMO_WEEK = { labels: WEEK_LABELS, counts: [3, 5, 6, 9, 8, 12, 14] };

const SPARK_FRACTIONS = [0.2, 0.35, 0.3, 0.5, 0.65, 0.6, 1];

// Build a 7-point proportional sparkline that ends exactly at `total` with a
// gentle uptrend — no more tiny-seeds-then-absolute-total vertical cliffs.
function makeSparkline(total: number, offset = 0): number[] {
  if (total <= 0) return [2, 2.5, 2, 3, 2.5, 3, 3.5]; // subtle flat baseline
  return SPARK_FRACTIONS.map((f, i) => {
    const jitter = ((i * 3 + offset * 7) % 5) * 0.02; // small, deterministic wobble
    return Math.max(0, Math.round(total * (f + jitter)));
  });
}

// Gentle weekday curve around a base value (used for avg. duration).
const TREND_FRACTIONS = [0.75, 1.1, 0.82, 1.25, 1.05, 0.95, 1];
function makeTrend(base: number): number[] {
  if (base <= 0) return [30, 45, 32, 50, 42, 38, 42]; // demo durations
  return TREND_FRACTIONS.map((f) => Math.round(base * f));
}

// ─── loading skeleton ─────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <Skeleton className="h-[220px] w-full rounded-2xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 lg:gap-6">
        <Skeleton className="xl:col-span-8 h-80 rounded-2xl" />
        <Skeleton className="xl:col-span-4 h-80 rounded-2xl" />
      </div>
    </div>
  );
}

// ─── main view ────────────────────────────────────────────────────────────────

export const HomeView = () => {
  const { hello, dashboard, health, data } = useDashboard();
  const router = useRouter();
  // Opens the NewMeetingDialog from the hero "New meeting" button, the empty
  // state, and the "Schedule" quick-launch card.
  const [newMeetingOpen, setNewMeetingOpen] = useState(false);

  const isLoading = hello.isLoading || dashboard.isLoading;
  const isError = hello.isError || dashboard.isError;

  const metrics = data?.metrics;
  const upcomingMeetings = data?.upcomingMeetings ?? [];
  const recentActivities = data?.recentActivities ?? [];
  const chartData = data?.chartData ?? [];

  // 7-day chart normalization + sparse-data fallback
  const weekly = useMemo(() => normalizeWeekly(chartData), [chartData]);
  const weeklyTotal = weekly.counts.reduce((a, b) => a + b, 0);
  const chartSparse = weeklyTotal <= 1;
  const chartLabels = chartSparse ? DEMO_WEEK.labels : weekly.labels;
  const chartCounts = chartSparse ? DEMO_WEEK.counts : weekly.counts;

  const insights = useMemo(() => {
    if (!metrics) return [];
    const list: { type: string; message: string }[] = [];
    if (metrics.meetings.trend > 0)
      list.push({
        type: "recommendation",
        message: `Meeting volume up ${metrics.meetings.trend}% this week.`,
      });
    if (metrics.meetings.total > 0)
      list.push({
        type: "opportunity",
        message: `${metrics.meetings.completed} meetings completed with AI agents.`,
      });
    if (metrics.recordings.total > 0)
      list.push({
        type: "tip",
        message: `${metrics.recordings.transcriptions} transcriptions ready for review.`,
      });
    if (metrics.agents.total > 0)
      list.push({
        type: "recommendation",
        message: `Most active agent: ${metrics.agents.mostUsed}.`,
      });
    return list.slice(0, 3);
  }, [metrics]);

  if (isLoading) return <DashboardSkeleton />;

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3 max-w-sm">
          <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto">
            <Activity className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-sm font-medium text-slate-700">
            Failed to load dashboard data.
          </p>
          <p className="text-xs text-slate-400">Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  // Metric cards — one semantic accent per card, proportional sparklines.
  const metricCards = [
    {
      title: "Total Meetings",
      value: metrics?.meetings.total ?? 0,
      icon: Video,
      trend: {
        value: Math.abs(metrics?.meetings.trend ?? 0),
        isPositive: (metrics?.meetings.trend ?? 0) >= 0,
      },
      chartData: chartCounts,
      chartColor: "#10b981",
    },
    {
      title: "Active AI Agents",
      value: metrics?.agents.total ?? 0,
      icon: Bot,
      description: `${metrics?.agents.mostUsed ?? "—"} is most active`,
      chartData: makeSparkline(metrics?.agents.total ?? 0, 1),
      chartColor: "#8b5cf6",
    },
    {
      title: "Voice Interactions",
      value: metrics?.voice.totalConversations ?? 0,
      icon: Mic,
      trend: { value: metrics?.voice.accuracy ?? 0, isPositive: true },
      description: `${metrics?.voice.responseTime ?? "—"}ms avg response`,
      chartData: makeSparkline(metrics?.voice.totalConversations ?? 0, 2),
      chartColor: "#3b82f6",
    },
    {
      title: "Recording Storage",
      value: `${metrics?.recordings.storageGB ?? 0} GB`,
      icon: FileAudio,
      description: `${metrics?.recordings.total ?? 0} recordings processed`,
      chartData: makeSparkline(metrics?.recordings.storageGB ?? 0, 3),
      chartColor: "#f59e0b",
    },
  ];

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="mx-auto w-full max-w-[1440px] flex flex-col gap-6 lg:gap-8"
    >
      {/* ── BAND A · HERO (full width) ───────────────────────────────────── */}
      <Section>
        <HeroSection
          userName={hello.data?.user?.name || "Nexa User"}
          metrics={metrics}
          upcomingCount={upcomingMeetings.length}
          onNewMeeting={() => setNewMeetingOpen(true)}
        />
      </Section>

      {/* ── BAND B · METRIC CARDS (full width) ───────────────────────────── */}
      <Section>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {metricCards.map((card, i) => (
            <motion.div key={card.title} variants={fadeUp} custom={i} className="h-full">
              <MetricCard {...card} />
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ── BAND C · INTELLIGENCE HUB (L8) + QUICK LAUNCH / STATUS (R4) ─── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 lg:gap-6 items-stretch">
        <Section className="xl:col-span-8 min-w-0 h-full">
          <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden h-full">
            <Tabs defaultValue="activity" className="flex flex-col flex-1 w-full">
              {/* Card header — title + subtitle stacked, tabs below on their own row */}
              <div className="flex flex-col gap-4 px-6 pt-5 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 tracking-tight">
                    Intelligence Hub
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Real-time workspace analytics
                  </p>
                </div>
                <TabsList className="bg-slate-100/80 border-0 p-1 rounded-xl h-9 w-fit">
                  <TabsTrigger
                    value="activity"
                    className="rounded-lg text-xs font-medium px-4 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm text-slate-500"
                  >
                    Activity
                  </TabsTrigger>
                  <TabsTrigger
                    value="performance"
                    className="rounded-lg text-xs font-medium px-4 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm text-slate-500"
                  >
                    Performance
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Chart area — fills remaining column height (no dead space) */}
              <div className="flex-1 p-4 min-h-[320px]">
                <TabsContent value="activity" className="h-full mt-0 outline-none">
                  <AnalyticsChart
                    title="Meeting Activity"
                    description="Volume of meetings over the last 7 days."
                    type="area"
                    series={[{ name: "Meetings", data: chartCounts }]}
                    categories={chartLabels}
                    colors={["#10b981"]}
                    height="100%"
                    hideHeader
                    className="h-full"
                  />
                </TabsContent>

                <TabsContent value="performance" className="h-full mt-0 outline-none">
                  <AnalyticsChart
                    title="Avg. Meeting Duration"
                    description="Tracking productivity and conversation length."
                    type="line"
                    series={[
                      {
                        name: "Duration (min)",
                        data: makeTrend(metrics?.meetings.avgDuration ?? 0),
                      },
                    ]}
                    categories={WEEK_LABELS}
                    colors={["#8b5cf6"]}
                    height="100%"
                    hideHeader
                    className="h-full"
                  />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </Section>

        <Section className="xl:col-span-4 h-full">
          <div className="flex flex-col gap-4 lg:gap-6 h-full">
            {/* Quick launch */}
            <div>
              <SectionHeader
                title="Quick launch"
                subtitle="Jump into common actions"
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-1 gap-3">
                <QuickActionCard
                  title="New Agent"
                  description="Deploy custom AI"
                  icon={Bot}
                  color="bg-violet-50 text-violet-600"
                  onClick={() => router.push("/agents")}
                />
                <QuickActionCard
                  title="Schedule"
                  description="Set a meeting"
                  icon={CalendarIcon}
                  color="bg-emerald-50 text-emerald-600"
                  onClick={() => setNewMeetingOpen(true)}
                />
                <QuickActionCard
                  title="Instant Call"
                  description="Start call now"
                  icon={Zap}
                  color="bg-amber-50 text-amber-600"
                  onClick={() => router.push("/meetings")}
                />
              </div>
            </div>

            {/* System Status — flex-1 so it stretches to meet the chart height */}
            <div className="flex-1 flex flex-col min-h-[200px]">
              <StatusMonitor items={health?.data?.services ?? []} />
            </div>
          </div>
        </Section>
      </div>

      {/* ── BAND D · UPCOMING SCHEDULE (L8) + AI INSIGHTS (R4) ───────────── */}
      {insights.length === 0 ? (
        <Section>
          <div className="h-full">
            <SectionHeader
              title="Upcoming Schedule"
              action={
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="text-xs text-slate-500 hover:text-emerald-600 font-medium gap-1.5 -mr-2"
                >
                  <Link href="/meetings">
                    View calendar
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </Button>
              }
            />

            {upcomingMeetings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 text-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                  <CalendarIcon className="w-5 h-5 text-slate-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-600">
                    No upcoming meetings
                  </p>
                  <p className="text-xs text-slate-400">
                    Schedule your first meeting to get started
                  </p>
                </div>
                <Button
                  size="sm"
                  className="mt-2 rounded-lg text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => setNewMeetingOpen(true)}
                >
                  Schedule meeting
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingMeetings.map((meeting) => (
                  <MeetingCard
                    key={meeting.id}
                    className="h-full"
                    id={meeting.id}
                    title={meeting.name}
                    agentName={meeting.agentName}
                    date={
                      meeting.startedAt
                        ? new Date(meeting.startedAt).toLocaleDateString()
                        : "TBD"
                    }
                    time={
                      meeting.startedAt
                        ? new Date(meeting.startedAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "TBD"
                    }
                    participants={1}
                    status={meeting.status as any}
                  />
                ))}
              </div>
            )}
          </div>
        </Section>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 lg:gap-6 items-stretch">
          <Section className="xl:col-span-8 min-w-0 h-full">
            <div className="h-full">
              <SectionHeader
                title="Upcoming Schedule"
                action={
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="text-xs text-slate-500 hover:text-emerald-600 font-medium gap-1.5 -mr-2"
                  >
                    <Link href="/meetings">
                      View calendar
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </Button>
                }
              />

              {upcomingMeetings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 text-center gap-3 h-full min-h-[260px]">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                    <CalendarIcon className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-600">
                      No upcoming meetings
                    </p>
                    <p className="text-xs text-slate-400">
                      Schedule your first meeting to get started
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="mt-2 rounded-lg text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => setNewMeetingOpen(true)}
                  >
                    Schedule meeting
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {upcomingMeetings.map((meeting) => (
                    <MeetingCard
                      key={meeting.id}
                      className="h-full"
                      id={meeting.id}
                      title={meeting.name}
                      agentName={meeting.agentName}
                      date={
                        meeting.startedAt
                          ? new Date(meeting.startedAt).toLocaleDateString()
                          : "TBD"
                      }
                      time={
                        meeting.startedAt
                          ? new Date(meeting.startedAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "TBD"
                      }
                      participants={1}
                      status={meeting.status as any}
                    />
                  ))}
                </div>
              )}
            </div>
          </Section>

          <Section className="xl:col-span-4 h-full">
            <div className="flex flex-col gap-3 h-full">
              <SectionHeader
                title="AI Insights"
                subtitle="Powered by your workspace data"
              />
              <div className="flex flex-1 flex-col gap-2.5">
                {insights.map((insight, i) => (
                  <InsightCard
                    key={i}
                    type={insight.type as any}
                    message={insight.message}
                  />
                ))}
              </div>
            </div>
          </Section>
        </div>
      )}

      {/* ── BAND E · RECENT ACTIVITY (full width) ───────────────────────── */}
      <Section>
        <SectionHeader
          title="Recent Activity"
          subtitle="Timeline of your workspace events"
          action={
            <Button
              asChild
              variant="outline"
              size="sm"
              className="text-xs rounded-lg border-slate-200 text-slate-600 hover:border-slate-300 gap-1.5"
            >
              <Link href="/meetings">
                <History className="w-3.5 h-3.5" />
                Full history
              </Link>
            </Button>
          }
        />

        {recentActivities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 gap-3 text-center">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
              <Activity className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-sm text-slate-500">No recent activity detected.</p>
          </div>
        ) : (
          <ActivityTimeline
            activities={recentActivities.map((a) => ({
              id: a.id,
              type: a.type as any,
              title: a.title,
              user: { name: "You" },
              time: new Date(a.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              description: a.description || undefined,
            }))}
          />
        )}
      </Section>

      {newMeetingOpen && (
        <NewMeetingDialog
          open={newMeetingOpen}
          onOpenChange={setNewMeetingOpen}
        />
      )}
    </motion.div>
  );
};