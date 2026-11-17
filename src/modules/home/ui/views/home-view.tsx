"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { trpc } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Bot,
  Calendar,
  ChevronDown,
  Clock,
  FileText,
  Play,
  Sparkles,
  TrendingUp,
  Video,
} from "lucide-react";
import { NewMeetingDialog } from "@/modules/meetings/ui/components/new-meeting-dialog";
import { OnboardingChecklist } from "../components/onboarding-checklist";
import { OverallSentimentCard } from "../components/overall-sentiment-card";
import { buildStatusBreakdown, computeTrend, type TrendResult } from "@/modules/home/lib/dashboard-data";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const RANGE_OPTIONS = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "12m", label: "Last 12 months" },
] as const;

type Range = "7d" | "30d" | "12m";

function StatCard({
  label,
  value,
  trend,
  icon: Icon,
}: {
  label: string;
  value: string;
  trend: TrendResult;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const isUp = trend.label === "up";
  const isDown = trend.label === "down";
  const isNew = trend.label === "new";
  const showTrend = isUp || isDown || isNew;
  const TrendIcon = isUp ? ArrowUp : ArrowDown;

  return (
    <Card className="rounded-2xl border border-gray-200/70 bg-white shadow-sm">
      <CardContent className="p-4 flex flex-col">
        <Icon className="size-[18px] text-brand-600 mb-3" aria-hidden="true" />
        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 mb-2">{label}</p>
        <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-2xl font-semibold text-gray-900">{value}</span>
          {showTrend && (
            <span
              className={`flex items-center gap-0.5 text-[11px] font-semibold ${
                isDown ? "text-danger" : "text-brand-600"
              }`}
            >
              {isNew ? (
                "New"
              ) : (
                <>
                  <TrendIcon className="size-3" aria-hidden="true" />
                  {Math.abs(trend.percent ?? 0)}%
                </>
              )}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export const HomeView = () => {
  const [range, setRange] = useState<Range>("7d");
  const [newMeetingOpen, setNewMeetingOpen] = useState(false);

  const hello = trpc.hello.useQuery({ text: "Nexa User" }, { staleTime: 30_000 });
  const overview = trpc.getOverview.useQuery({ range }, { staleTime: 30_000 });

  const data = overview.data;
  const isLoading = hello.isLoading || overview.isLoading;

  const statusBreakdown = data ? buildStatusBreakdown(data.statusBreakdown) : null;

  const activitySeries = data
    ? [
        { name: "Meetings", data: data.series.meetings.map((b: { date: string; count: number }) => b.count) },
        { name: "Participants", data: data.series.voice.map((b: { date: string; count: number }) => b.count) },
      ]
    : [];
  const categories = data ? data.series.meetings.map((b: { date: string; count: number }) => b.date) : [];

  // Current-window counts for the stat-card trend badges.
  const curMeetings = data ? data.series.meetings.reduce((acc, b: { count: number }) => acc + b.count, 0) : 0;
  const curVoice = data ? data.series.voice.reduce((acc, b: { count: number }) => acc + b.count, 0) : 0;

  const hasActivity = data ? data.series.meetings.some((b) => b.count > 0) || data.series.voice.some((b) => b.count > 0) : false;

  if (isLoading) {
    return (
      <div className="space-y-5">
        {/* Stat cards skeleton row */}
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-5">
          {/* Left column */}
          <div className="flex flex-col gap-5">
            {/* Stat cards row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-[150px] rounded-2xl" />
              ))}
            </div>
          </div>
          {/* Right column */}
          <div className="flex flex-col gap-5">
            {/* Sentiment skeleton */}
            <Skeleton className="h-[150px] rounded-2xl" />
          </div>
        </div>
        {/* Activity chart skeleton */}
        <Skeleton className="h-72 rounded-2xl" />
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

  return (
    <div className="space-y-8">
      <OnboardingChecklist />

      {/* Stat cards - compact horizontal row, 4 equal columns */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Total meetings"
          value={(data?.totals.meetings ?? 0).toLocaleString("en-US")}
          trend={computeTrend(curMeetings, data?.previous.meetings ?? 0)}
          icon={Video}
        />
        <StatCard
          label="AI insights"
          value={(data?.totals.summariesReady ?? 0).toLocaleString("en-US")}
          trend={computeTrend(data?.stats.insights.current ?? 0, data?.stats.insights.previous ?? 0)}
          icon={Sparkles}
        />
        <StatCard
          label="Engagement"
          value={(data?.totals.voiceInteractions ?? 0).toLocaleString("en-US")}
          trend={computeTrend(curVoice, data?.previous.voiceInteractions ?? 0)}
          icon={TrendingUp}
        />
        <StatCard
          label="Analytics"
          value={`${statusBreakdown?.percentages.completed ?? 0}%`}
          trend={computeTrend(data?.stats.analytics.current ?? 0, data?.stats.analytics.previous ?? 0)}
          icon={BarChart3}
        />
      </div>

      {/* Main grid: left column for activity + recent, right column for status + insights + upcoming */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left column (2/3 width) */}
        <div className="space-y-8 lg:col-span-2">
          {/* Meeting Activity Chart */}
          <Card className="rounded-2xl border border-brand-100">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-lg font-semibold">Meeting activity</CardTitle>
                <CardDescription className="text-xs text-text-muted mt-1">Meetings and participants over time</CardDescription>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3 py-1.5">
                <select
                  value={range}
                  onChange={(e) => setRange(e.target.value as Range)}
                  className="bg-transparent text-sm font-medium outline-none text-text"
                  aria-label="Range"
                >
                  {RANGE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="size-4 text-text-muted pointer-events-none" />
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              {hasActivity ? (
                <>
                  {/* Legend */}
                  <div className="flex gap-6 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="size-2.5 rounded-full bg-brand-800" />
                      <span className="text-xs font-medium text-text-muted">Meetings</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="size-2.5 rounded-full bg-brand-400" />
                      <span className="text-xs font-medium text-text-muted">Participants</span>
                    </div>
                  </div>
                  <Chart
                    options={{
                      chart: { toolbar: { show: false }, animations: { enabled: !window.matchMedia("(prefers-reduced-motion: reduce)").matches } },
                      colors: ["#14533a", "#55b884"],
                      stroke: { curve: "smooth", width: 2 },
                      fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.2, opacityTo: 0, stops: [0, 100] } },
                      xaxis: { categories, axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { colors: "#7b8b83", fontSize: "12px" } } },
                      grid: { strokeDashArray: 4, borderColor: "#e1ece5", yaxis: { lines: { show: true } }, xaxis: { lines: { show: false } } },
                      legend: { show: false },
                      tooltip: { shared: true, intersect: false, theme: "light" },
                      dataLabels: { enabled: false },
                      markers: { size: 4, hover: { size: 6 } },
                    } as any}
                    series={activitySeries}
                    type="area"
                    height={260}
                  />
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-sm text-text-muted">No activity in this range.</p>
                  <Button asChild size="sm" className="mt-3">
                    <Link href="/agents">Try a template</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Meetings */}
          <Card className="rounded-2xl border border-brand-100">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-lg font-semibold">Recent meetings</CardTitle>
                <CardDescription className="text-xs text-text-muted mt-1">Latest sessions</CardDescription>
              </div>
              <Link href="/meetings" className="text-xs font-medium text-brand-700 hover:text-brand-800">
                View all
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {(data?.recentMeetings ?? []).slice(0, 3).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <p className="text-sm text-text-muted">No meetings yet.</p>
                  <Button asChild size="sm" className="mt-3">
                    <Link href="/agents">Try a template</Link>
                  </Button>
                </div>
              ) : (
                (data?.recentMeetings ?? []).slice(0, 3).map((m: { id: string; name: string; status: string; startedAt: string | null; createdAt: string; agentName: string; hasSummary: boolean; recordingUrl: string | null }, i: number) => (
                  <div key={m.id} className="flex items-center justify-between border-b border-brand-100 pb-3 last:border-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-text-muted">{String(i + 1).padStart(2, '0')}.</span>
                        <Link href={`/meetings/${m.id}`} className="text-sm font-medium text-text hover:text-brand-700 truncate">
                          {m.name}
                        </Link>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted ml-7">
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3" />
                          {m.startedAt ? new Date(m.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : new Date(m.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          {m.startedAt ? new Date(m.startedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "10:00 AM"} · 1h
                        </span>
                        <span className="flex items-center gap-1">
                          <Bot className="size-3" />
                          {m.agentName}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-4">
                      {m.recordingUrl && (
                        <Button size="sm" variant="ghost" asChild className="h-8 w-8 p-0">
                          <a href={m.recordingUrl} target="_blank" rel="noopener noreferrer" aria-label="Play recording">
                            <Play className="size-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column (1/3 width) */}
        <div className="space-y-8">
          {/* Overall Sentiment (populated from AI summary sentiment) */}
          <OverallSentimentCard sentiment={data?.sentiment} />

          {/* Meeting Status Donut */}
          <Card className="rounded-2xl border border-brand-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">Meeting status</CardTitle>
            </CardHeader>
            <CardContent>
              {statusBreakdown && statusBreakdown.total > 0 ? (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <Chart
                      options={{
                        chart: { type: "donut" },
                        labels: ["Completed", "Ongoing", "Scheduled"],
                        colors: ["#0f3d2b", "#2f9e68", "#b9e6cb"],
                        legend: { show: false },
                        dataLabels: { enabled: false },
                        plotOptions: { pie: { donut: { size: "70%" } } },
                        stroke: { width: 0 },
                      } as any}
                      series={[statusBreakdown.completed, statusBreakdown.ongoing, statusBreakdown.scheduled]}
                      type="donut"
                      height={180}
                    />
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="size-2 rounded-full bg-brand-900" />
                        <span className="text-text-muted">Completed</span>
                      </div>
                      <span className="font-medium text-text">{statusBreakdown.percentages.completed}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="size-2 rounded-full bg-brand-500" />
                        <span className="text-text-muted">Ongoing</span>
                      </div>
                      <span className="font-medium text-text">{statusBreakdown.percentages.ongoing}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="size-2 rounded-full bg-brand-200" />
                        <span className="text-text-muted">Scheduled</span>
                      </div>
                      <span className="font-medium text-text">{statusBreakdown.percentages.scheduled}%</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-text-muted text-center py-6">No meetings yet.</p>
              )}
            </CardContent>
          </Card>

          {/* AI Insights */}
          <Card className="rounded-2xl border border-brand-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">AI Insights</CardTitle>
              <CardDescription className="text-xs text-text-muted mt-1">Smart recommendations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data?.insights.completedWithoutSummary === 0 ? (
                <p className="text-xs text-text-muted">All caught up!</p>
              ) : (
                <>
                  <div className="flex gap-3">
                    <FileText className="size-4 text-brand-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-text">Summaries Pending</p>
                      <p className="text-xs text-text-muted mt-0.5">{data?.insights.completedWithoutSummary || 0} meetings awaiting AI summaries</p>
                    </div>
                  </div>
                  {data?.insights.scheduledCount ? (
                    <div className="flex gap-3">
                      <FileText className="size-4 text-brand-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-text">Upcoming Meetings</p>
                        <p className="text-xs text-text-muted mt-0.5">{data.insights.scheduledCount} scheduled meetings this week</p>
                      </div>
                    </div>
                  ) : null}
                  {data?.mostUsedAgent ? (
                    <div className="flex gap-3">
                      <FileText className="size-4 text-brand-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-text">Most Used Agent</p>
                        <p className="text-xs text-text-muted mt-0.5">{data.mostUsedAgent.name}</p>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Meetings */}
          <Card className="rounded-2xl border border-brand-100">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-lg font-semibold">Upcoming</CardTitle>
                <CardDescription className="text-xs text-text-muted mt-1">Next scheduled meetings</CardDescription>
              </div>
              <Link href="/meetings" className="text-xs font-medium text-brand-700 hover:text-brand-800">
                View all
              </Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {(data?.upcomingMeetings ?? []).slice(0, 3).length === 0 ? (
                <p className="text-xs text-text-muted text-center py-6">No upcoming meetings.</p>
              ) : (
                (data?.upcomingMeetings ?? []).slice(0, 3).map((m: { id: string; name: string; agentName: string }, idx: number) => (
                  <div key={m.id} className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-brand-50 transition-colors border-b border-brand-100 pb-2 last:border-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-text truncate">{m.name}</p>
                      <p className="text-xs text-text-muted">2:00 PM · {m.agentName}</p>
                    </div>
                    <Button
                      asChild
                      size="sm"
                      variant={idx === 0 ? "default" : "outline"}
                      className="rounded-full px-4 h-7 text-xs"
                    >
                      <Link href={`/call/${m.id}`}>Join</Link>
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <NewMeetingDialog open={newMeetingOpen} onOpenChange={setNewMeetingOpen} />
    </div>
  );
};
