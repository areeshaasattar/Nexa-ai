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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GeneratedAvatar } from "@/components/generated-avatar";
import { NewMeetingDialog } from "@/modules/meetings/ui/components/new-meeting-dialog";
import { OnboardingChecklist } from "../components/onboarding-checklist";
import { computeTrend, buildStatusBreakdown, buildInsights } from "@/modules/home/lib/dashboard-data";
import { StatusMonitor } from "../components/status-monitor";

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
    <Card className="rounded-2xl">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <span className="flex size-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
            <Icon className="size-4" aria-hidden="true" />
          </span>
          {trend && trend.label !== "none" && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                trend.label === "up" && "bg-emerald-100 text-emerald-700",
                trend.label === "down" && "bg-red-100 text-red-700",
                trend.label === "new" && "bg-slate-100 text-slate-600",
              )}
            >
              {trend.label === "up" && <TrendingUp className="size-3" aria-hidden="true" />}
              {trend.label === "down" && <TrendingDown className="size-3" aria-hidden="true" />}
              {trend.label === "new" ? "New" : trend.percent !== null ? `${trend.percent}%` : ""}
            </span>
          )}
        </div>
        <div className="mt-3 text-3xl font-bold tracking-tight">{value}</div>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</div>
        {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
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
  // summaries trend not tracked separately; use meetings trend? spec: trend on cards 1 and 3. We'll show trend on meetings only (no prev summaries). Show "New" if summariesReady>0 and meetings prev 0? Keep none for summaries to avoid invention.
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
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  if (overview.isError) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-center space-y-3">
          <p className="text-sm font-medium text-slate-700">Failed to load dashboard.</p>
          <Button onClick={() => overview.refetch()}>Retry</Button>
        </div>
      </div>
    );
  }

  const avgReplySec = data?.totals.avgReplyMs ? (data.totals.avgReplyMs / 1000).toFixed(1) : null;

  return (
    <div className="space-y-6">
      <OnboardingChecklist />

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Activity chart */}
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Meeting activity</CardTitle>
                <CardDescription>Meetings and voice interactions over time.</CardDescription>
              </div>
              <select
                value={range}
                onChange={(e) => setRange(e.target.value as Range)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm"
                aria-label="Range"
              >
                {RANGE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </CardHeader>
            <CardContent>
              {hasActivity ? (
                <Chart
                  options={{
                    chart: { toolbar: { show: false }, animations: { enabled: !window.matchMedia("(prefers-reduced-motion: reduce)").matches } },
                    colors: ["#052e16", "#10b981"],
                    stroke: { curve: "smooth", width: 3 },
                    fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0 } },
                    xaxis: { categories },
                    grid: { strokeDashArray: 4, borderColor: "#e2e8f0" },
                    legend: { position: "top" },
                    tooltip: { shared: true, intersect: false },
                  }}
                  series={activitySeries}
                  type="area"
                  height={300}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <p className="text-sm text-slate-500">No activity in this range.</p>
                  <Button asChild size="sm" className="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Link href="/agents">Try a template</Link>
                  </Button>
                </div>
              )}
              <span className="sr-only">
                {`Meeting activity for ${range}: ${data?.series.meetings.reduce((a: number, b: { count: number }) => a + b.count, 0) ?? 0} meetings, ${data?.series.voice.reduce((a: number, b: { count: number }) => a + b.count, 0) ?? 0} voice interactions.`}
              </span>
            </CardContent>
          </Card>

          {/* Recent meetings */}
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent meetings</CardTitle>
              <Link href="/meetings" className="text-sm text-emerald-600 hover:underline">
                View all
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {(data?.recentMeetings ?? []).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <p className="text-sm text-slate-500">No meetings yet.</p>
                  <Button asChild size="sm" className="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Link href="/agents">Try a template</Link>
                  </Button>
                </div>
              ) : (
                (data?.recentMeetings ?? []).map((m: { id: string; name: string; status: string; startedAt: string | null; createdAt: string; agentName: string; hasSummary: boolean; recordingUrl: string | null }, i: number) => (
                  <div key={m.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="text-xs font-semibold text-slate-400">{i + 1}</span>
                      <GeneratedAvatar seed={m.agentName} className="size-8" />
                      <div className="min-w-0">
                        <Link href={`/meetings/${m.id}`} className="block truncate font-medium hover:underline" title={m.name}>
                          {m.name}
                        </Link>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className={cn("rounded-full px-2 py-0.5", m.status === "completed" && "bg-emerald-100 text-emerald-700", m.status === "ongoing" && "bg-blue-100 text-blue-700", m.status === "scheduled" && "bg-slate-100 text-slate-600")}>
                            {m.status}
                          </span>
                          {m.hasSummary && (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">Summary ready</span>
                          )}
                          <span>{m.startedAt ? new Date(m.startedAt).toLocaleDateString() : new Date(m.createdAt).toLocaleDateString()}</span>
                          {m.agentName && <span>· {m.agentName}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {m.recordingUrl && (
                        <a
                          href={m.recordingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex size-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
                          aria-label="Play recording"
                        >
                          <Play className="size-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Status donut */}
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Meeting status</CardTitle>
            </CardHeader>
            <CardContent>
              {statusBreakdown && statusBreakdown.total > 0 ? (
                <div className="flex items-center gap-4">
                  <Chart
                    options={{
                      chart: { type: "donut" },
                      labels: ["Completed", "Ongoing", "Scheduled"],
                      colors: ["#052e16", "#10b981", "#86efac"],
                      legend: { show: false },
                      dataLabels: { enabled: false },
                    }}
                    series={[statusBreakdown.completed, statusBreakdown.ongoing, statusBreakdown.scheduled]}
                    type="donut"
                    height={180}
                  />
                  <div className="space-y-1 text-sm">
                    <div>Completed {statusBreakdown.percentages.completed}%</div>
                    <div>Ongoing {statusBreakdown.percentages.ongoing}%</div>
                    <div>Scheduled {statusBreakdown.percentages.scheduled}%</div>
                    <div className="font-semibold">Total {statusBreakdown.total}</div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">No meetings yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Insights */}
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {insights.map((ins) => (
                <div key={ins.id} className="text-sm text-slate-700">
                  {ins.href ? (
                    <Link href={ins.href} className="text-emerald-600 hover:underline">
                      {ins.text}
                    </Link>
                  ) : (
                    ins.text
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Upcoming */}
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Upcoming</CardTitle>
              <Link href="/meetings" className="text-sm text-emerald-600 hover:underline">
                View all
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {(data?.upcomingMeetings ?? []).length === 0 ? (
                <p className="text-sm text-slate-500">No upcoming meetings.</p>
              ) : (
                (data?.upcomingMeetings ?? []).map((m: { id: string; name: string; agentName: string }) => (
                  <div key={m.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-medium" title={m.name}>{m.name}</div>
                      <div className="text-xs text-slate-500">{m.agentName}</div>
                    </div>
                    <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                      <Link href={`/call/${m.id}`}>Join</Link>
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* System status compact */}
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>System status</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusMonitor items={health?.data?.services ?? []} />
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