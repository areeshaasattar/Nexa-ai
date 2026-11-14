"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { trpc } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Activity,
  ArrowUpRight,
  Bot,
  Calendar,
  CheckCircle2,
  Circle,
  FileText,
  Mic,
  MoreHorizontal,
  Play,
  TrendingDown,
  TrendingUp,
  Video,
  Clock,
  Dot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GeneratedAvatar } from "@/components/generated-avatar";
import { NewMeetingDialog } from "@/modules/meetings/ui/components/new-meeting-dialog";
import { OnboardingChecklist } from "../components/onboarding-checklist";
import { computeTrend, buildStatusBreakdown, buildInsights } from "@/modules/home/lib/dashboard-data";
import { StatusMonitor } from "../components/status-monitor";
import { Badge } from "@/components/ui/badge";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const RANGE_OPTIONS = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "12m", label: "Last 12 months" },
] as const;

type Range = "7d" | "30d" | "12m";

function StatCard({
  title,
  value,
  sub,
  trend,
  icon: Icon,
}: {
  title: string;
  value: number | string;
  sub?: string;
  trend?: { percent: number | null; label: "up" | "down" | "new" | "none" };
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="rounded-xl flex flex-col justify-between min-h-28">
      <CardContent className="p-4 flex flex-col justify-between flex-1">
        <div className="flex items-start justify-between mb-2">
          <span className="flex size-10 items-center justify-center rounded-lg border border-brand-200 text-brand-600">
            <Icon className="size-5" aria-hidden="true" />
          </span>
          {trend && trend.label !== "none" && (
            <Badge
              variant={trend.label === "up" ? "success" : trend.label === "down" ? "destructive" : "neutral"}
              className="text-xs"
            >
              {trend.label === "up" && <TrendingUp className="size-2" aria-hidden="true" />}
              {trend.label === "down" && <TrendingDown className="size-2" aria-hidden="true" />}
              {trend.label === "new" ? "New" : trend.percent !== null ? `${trend.percent}%` : ""}
            </Badge>
          )}
        </div>
        <div className="space-y-1">
          <div className="text-2xl font-bold tracking-tight">{value}</div>
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">{title}</div>
          {sub && <div className="mt-1.5 text-xs text-text-muted truncate">{sub}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

export const HomeView = () => {
  const router = useRouter();
  const [range, setRange] = useState<Range>("7d");
  const [newMeetingOpen, setNewMeetingOpen] = useState(false);

  const hello = trpc.hello.useQuery({ text: "Nexa User" }, { staleTime: 30_000 });
  const overview = trpc.getOverview.useQuery({ range }, { staleTime: 30_000 });
  const health = trpc.getSystemHealth.useQuery(undefined, { staleTime: 15_000 });
  const recentActivity = trpc.getRecentActivity.useQuery(undefined, { staleTime: 30_000 });

  const data = overview.data;
  const isLoading = hello.isLoading || overview.isLoading;

  const trendMeetings = data ? computeTrend(data.totals.meetings, data.previous.meetings) : { percent: null, label: "none" as const };
  const trendSummaries = { percent: null, label: "none" as const };

  const statusBreakdown = data ? buildStatusBreakdown(data.statusBreakdown) : null;

  const insights = data
    ? buildInsights({
        completedWithoutSummary: data.insights.completedWithoutSummary,
        oldestCompletedWithoutSummaryId: data.insights.oldestCompletedWithoutSummaryId,
        scheduledCount: data.insights.scheduledCount,
        lastCallDate: data.insights.lastCallDate ? new Date(data.insights.lastCallDate) : null,
        hasAgent: data.insights.hasAgent,
        avgReplyMs: data.totals.avgReplyMs,
        voiceInteractions: data.totals.voiceInteractions,
        mostUsedAgent: data.mostUsedAgent,
        now: new Date(),
      })
    : [];

  const activitySeries = data
    ? [
        { name: "Meetings", data: data.series.meetings.map((b: { date: string; count: number }) => b.count) },
        { name: "Voice interactions", data: data.series.voice.map((b: { date: string; count: number }) => b.count) },
      ]
    : [];
  const categories = data ? data.series.meetings.map((b: { date: string; count: number }) => b.date) : [];

  const hasActivity = data ? data.series.meetings.some((b) => b.count > 0) || data.series.voice.some((b) => b.count > 0) : false;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  if (overview.isError) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-center space-y-3">
          <p className="text-sm font-medium text-text">Failed to load dashboard.</p>
          <Button onClick={() => overview.refetch()}>Retry</Button>
        </div>
      </div>
    );
  }

  const avgReplySec = data?.totals.avgReplyMs ? (data.totals.avgReplyMs / 1000).toFixed(1) : null;

  return (
    <div className="space-y-6">
      <OnboardingChecklist />

      {/* Stat cards - 4 columns */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          title="Total meetings"
          value={data?.totals.meetings ?? 0}
          trend={trendMeetings}
          icon={Video}
        />
        <StatCard
          title="Active agents"
          value={data?.totals.agents ?? 0}
          sub={data?.mostUsedAgent ? `Most used: ${data.mostUsedAgent.name}` : undefined}
          icon={Bot}
        />
        <StatCard
          title="Summaries ready"
          value={data?.totals.summariesReady ?? 0}
          icon={FileText}
        />
        <StatCard
          title="Voice interactions"
          value={data?.totals.voiceInteractions ?? 0}
          sub={avgReplySec ? `avg reply ${avgReplySec} s` : undefined}
          icon={Mic}
        />
      </div>

      {/* Main grid: left 8 cols, right 4 cols */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Left column (col-span-8) */}
        <div className="space-y-6 xl:col-span-8">
          {/* Row 1: Activity chart */}
          <Card className="rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <div>
                <CardTitle className="text-base">Meeting activity</CardTitle>
                <CardDescription className="text-xs mt-1">Meetings and voice interactions over time.</CardDescription>
              </div>
              <select
                value={range}
                onChange={(e) => setRange(e.target.value as Range)}
                className="rounded-full border border-border bg-surface-soft px-3 py-2 text-sm font-medium text-text-muted outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Range"
              >
                {RANGE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </CardHeader>
            <CardContent className="pt-0">
              {hasActivity ? (
                <Chart
                  options={{
                    chart: { toolbar: { show: false }, animations: { enabled: !window.matchMedia("(prefers-reduced-motion: reduce)").matches } },
                    colors: ["#14533a", "#55b884"],
                    stroke: { curve: "smooth", width: 2 },
                    fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.28, opacityTo: 0, stops: [0, 100] } },
                    xaxis: { categories, axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { colors: "#7b8b83", fontSize: "11px" } } },
                    grid: { strokeDashArray: 4, borderColor: "#e1ece5", yaxis: { lines: { show: true } }, xaxis: { lines: { show: false } } },
                    legend: { show: false },
                    tooltip: { shared: true, intersect: false, theme: "light", style: { background: "#ffffff", borderRadius: "12px" }, y: { formatter: (value: number) => value.toString() } },
                    dataLabels: { enabled: false },
                    markers: { size: 0, hover: { size: 5, sizeOffset: 3, color: "#ffffff", strokeColor: "#55b884", strokeWidth: 1 } },
                  } as any}
                  series={activitySeries}
                  type="area"
                  height={240}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <p className="text-sm text-text-muted">No activity in this range.</p>
                  <Button asChild size="sm" className="mt-3">
                    <Link href="/agents">Try a template</Link>
                  </Button>
                </div>
              )}
              <span className="sr-only">
                {`Meeting activity for ${range}: ${data?.series.meetings.reduce((a: number, b: { count: number }) => a + b.count, 0) ?? 0} meetings, ${data?.series.voice.reduce((a: number, b: { count: number }) => a + b.count, 0) ?? 0} voice interactions.`}
              </span>
            </CardContent>
          </Card>

          {/* Row 2: Recent meetings */}
          <Card className="rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base">Recent meetings</CardTitle>
                <CardDescription className="text-xs mt-1">Latest sessions</CardDescription>
              </div>
              <Link href="/meetings" className="text-xs font-medium text-brand-700 hover:text-brand-800">
                View all
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(data?.recentMeetings ?? []).slice(0, 4).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <p className="text-sm text-text-muted">No meetings yet.</p>
                    <Button asChild size="sm" className="mt-3">
                      <Link href="/agents">Try a template</Link>
                    </Button>
                  </div>
                ) : (
                  (data?.recentMeetings ?? []).slice(0, 4).map((m: { id: string; name: string; status: string; startedAt: string | null; createdAt: string; agentName: string; hasSummary: boolean; recordingUrl: string | null }, i: number) => (
                    <div key={m.id} className="flex items-start justify-between gap-3 rounded-lg border border-border bg-surface-soft p-4 hover:shadow-sm transition-shadow">
                      <div className="flex min-w-0 items-start gap-3 flex-1">
                        <span className="text-xs font-semibold text-text-muted mt-0.5">{String(i + 1).padStart(2, '0')}.</span>
                        <div className="min-w-0 flex-1">
                          <Link href={`/meetings/${m.id}`} className="block truncate font-medium text-sm text-brand-700 hover:underline" title={m.name}>
                            {m.name}
                          </Link>
                          <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-text-muted">
                            <Badge variant={m.status === "completed" ? "success" : m.status === "ongoing" ? "default" : "neutral"} className="text-xs">
                              {m.status}
                            </Badge>
                            {m.hasSummary && (
                              <Badge variant="default" className="text-xs">
                                <FileText className="size-2 mr-1" />
                                Summary ready
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-text-muted">
                            <span className="flex items-center gap-1">
                              <Calendar className="size-3" />
                              {m.startedAt ? new Date(m.startedAt).toLocaleDateString("en-US", { year: "2-digit", month: "short", day: "numeric" }) : new Date(m.createdAt).toLocaleDateString("en-US", { year: "2-digit", month: "short", day: "numeric" })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Bot className="size-3" />
                              {m.agentName}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {m.recordingUrl && (
                          <Button
                            size="icon"
                            variant="ghost"
                            asChild
                          >
                            <a
                              href={m.recordingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label="Play recording"
                            >
                              <Play className="size-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column (col-span-4) */}
        <div className="space-y-6 xl:col-span-4">
          {/* Status donut */}
          <Card className="rounded-xl">
            <CardHeader className="space-y-0">
              <CardTitle className="text-base">Meeting status</CardTitle>
            </CardHeader>
            <CardContent>
              {statusBreakdown && statusBreakdown.total > 0 ? (
                <div className="flex flex-col items-center gap-4">
                  <Chart
                    options={{
                      chart: { type: "donut" },
                      labels: ["Completed", "Ongoing", "Scheduled"],
                      colors: ["#0f3d2b", "#2f9e68", "#b9e6cb"],
                      legend: { show: false },
                      dataLabels: { enabled: false },
                      plotOptions: { pie: { donut: { size: "65%" } } },
                      stroke: { width: 0 },
                    } as any}
                    series={[statusBreakdown.completed, statusBreakdown.ongoing, statusBreakdown.scheduled]}
                    type="donut"
                    height={160}
                  />
                  <div className="w-full space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Dot className="size-2 text-brand-900 fill-current" />
                        <span>Completed</span>
                      </div>
                      <span className="font-medium">{statusBreakdown.percentages.completed}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Dot className="size-2 text-brand-500 fill-current" />
                        <span>Ongoing</span>
                      </div>
                      <span className="font-medium">{statusBreakdown.percentages.ongoing}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Dot className="size-2 text-brand-200 fill-current" />
                        <span>Scheduled</span>
                      </div>
                      <span className="font-medium">{statusBreakdown.percentages.scheduled}%</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-text-muted text-center py-8">No meetings yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Insights */}
          <Card className="rounded-xl">
            <CardHeader className="space-y-0">
              <CardTitle className="text-base">Insights</CardTitle>
              <CardDescription className="text-xs mt-1">Suggestions from your activity</CardDescription>
            </CardHeader>
            <CardContent>
              {insights.length === 0 ? (
                <p className="text-sm text-text-muted">You are all caught up.</p>
              ) : (
                <div className="space-y-3">
                  {insights.map((ins) => (
                    <div key={ins.id} className="rounded-lg border border-brand-200 bg-brand-50 p-3.5">
                      <div className="flex gap-3">
                        <span className="flex size-9 items-center justify-center rounded-lg border border-brand-200 text-brand-600 shrink-0">
                          <FileText className="size-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          {ins.href ? (
                            <Link href={ins.href} className="block font-medium text-sm text-text hover:underline">
                              {ins.text}
                            </Link>
                          ) : (
                            <div className="font-medium text-sm text-text">{ins.text}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming */}
          <Card className="rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base">Upcoming</CardTitle>
                <CardDescription className="text-xs mt-1">Next scheduled meetings</CardDescription>
              </div>
              <Link href="/meetings" className="text-xs font-medium text-brand-700 hover:text-brand-800">
                View all
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(data?.upcomingMeetings ?? []).slice(0, 4).length === 0 ? (
                  <p className="text-sm text-text-muted text-center py-8">No upcoming meetings.</p>
                ) : (
                  (data?.upcomingMeetings ?? []).slice(0, 4).map((m: { id: string; name: string; agentName: string; scheduledAt?: string }, idx: number) => (
                    <div key={m.id} className="flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-brand-50 transition-colors">
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-sm" title={m.name}>{m.name}</div>
                        <div className="text-xs text-text-muted mt-1 flex items-center gap-1">
                          <Clock className="size-3" />
                          {m.agentName}
                        </div>
                      </div>
                      <Button
                        asChild
                        size="sm"
                        variant={idx === 0 ? "default" : "outline"}
                        className={idx === 0 ? "rounded-full" : "rounded-full"}
                      >
                        <Link href={`/call/${m.id}`}>Join</Link>
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {newMeetingOpen && (
        <NewMeetingDialog open={newMeetingOpen} onOpenChange={setNewMeetingOpen} />
      )}
    </div>
  );
};