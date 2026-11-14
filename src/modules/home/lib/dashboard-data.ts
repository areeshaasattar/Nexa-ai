export type Range = "7d" | "30d" | "12m";

export interface TrendResult {
  percent: number | null; // null => no badge
  label: "up" | "down" | "new" | "none";
}

export function computeTrend(current: number, previous: number): TrendResult {
  if (current === 0 && previous === 0) return { percent: null, label: "none" };
  if (previous === 0 && current > 0) return { percent: null, label: "new" };
  if (previous === 0) return { percent: null, label: "none" };
  const pct = ((current - previous) / previous) * 100;
  if (!Number.isFinite(pct)) return { percent: null, label: "none" };
  const rounded = Math.round(pct);
  return { percent: rounded, label: rounded >= 0 ? "up" : "down" };
}

export interface Bucket {
  label: string; // display label (date or month)
  key: string; // sort key (ISO date)
  meetings: number;
  voiceInteractions: number;
}

function startOfDayUtc(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function fillBuckets(
  meetingsByDay: { date: string; count: number }[],
  voiceByDay: { date: string; count: number }[],
  range: Range,
  now: Date = new Date(),
): Bucket[] {
  const mMap = new Map(meetingsByDay.map((r) => [r.date, r.count]));
  const vMap = new Map(voiceByDay.map((r) => [r.date, r.count]));

  if (range === "12m") {
    const buckets: Bucket[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      const key = monthKey(d);
      buckets.push({
        label: d.toLocaleString("en-US", { month: "short", timeZone: "UTC" }),
        key,
        meetings: mMap.get(key) ?? 0,
        voiceInteractions: vMap.get(key) ?? 0,
      });
    }
    return buckets;
  }

  const days = range === "7d" ? 7 : 30;
  const buckets: Bucket[] = [];
  const today = startOfDayUtc(now);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    buckets.push({
      label: d.toLocaleString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
      key,
      meetings: mMap.get(key) ?? 0,
      voiceInteractions: vMap.get(key) ?? 0,
    });
  }
  return buckets;
}

export interface StatusBreakdown {
  completed: number;
  ongoing: number;
  scheduled: number;
  total: number;
  percentages: { completed: number; ongoing: number; scheduled: number };
}

export function buildStatusBreakdown(counts: {
  completed: number;
  ongoing: number;
  scheduled: number;
}): StatusBreakdown {
  const total = counts.completed + counts.ongoing + counts.scheduled;
  if (total === 0) {
    return { ...counts, total: 0, percentages: { completed: 0, ongoing: 0, scheduled: 0 } };
  }
  // largest remainder
  const raw = [
    { key: "completed" as const, val: counts.completed },
    { key: "ongoing" as const, val: counts.ongoing },
    { key: "scheduled" as const, val: counts.scheduled },
  ];
  const floors = raw.map((r) => ({ ...r, floor: Math.floor((r.val / total) * 100), rem: (r.val / total) * 100 - Math.floor((r.val / total) * 100) }));
  let sum = floors.reduce((a, b) => a + b.floor, 0);
  const sorted = [...floors].sort((a, b) => b.rem - a.rem);
  let idx = 0;
  while (sum < 100 && idx < sorted.length) {
    sorted[idx].floor += 1;
    sum += 1;
    idx = (idx + 1) % sorted.length;
  }
  const percentages = { completed: 0, ongoing: 0, scheduled: 0 };
  for (const f of floors) {
    percentages[f.key] = f.floor;
  }
  // Recompute from floors (which were mutated in place)
  const p2 = { completed: 0, ongoing: 0, scheduled: 0 };
  for (const f of floors) {
    p2[f.key] = f.floor;
  }
  return { ...counts, total, percentages: p2 };
}

export interface InsightInput {
  completedWithoutSummary: number;
  oldestCompletedWithoutSummaryId: string | null;
  scheduledCount: number;
  lastCallDate: Date | null;
  hasAgent: boolean;
  avgReplyMs: number | null;
  voiceInteractions: number;
  mostUsedAgent: { name: string; count: number } | null;
  now: Date;
}

export interface Insight {
  id: string;
  text: string;
  href?: string;
}

export function buildInsights(input: InsightInput): Insight[] {
  const out: Insight[] = [];
  // priority order
  if (input.completedWithoutSummary > 0 && input.oldestCompletedWithoutSummaryId) {
    out.push({
      id: "missing-summary",
      text: `${input.completedWithoutSummary} completed meeting${input.completedWithoutSummary === 1 ? "" : "s"} have no summary yet`,
      href: `/meetings/${input.oldestCompletedWithoutSummaryId}`,
    });
  }
  if (input.scheduledCount > 0) {
    out.push({
      id: "scheduled-waiting",
      text: `${input.scheduledCount} scheduled meeting${input.scheduledCount === 1 ? "" : "s"} are waiting`,
      href: "/meetings",
    });
  }
  const sevenDaysAgo = new Date(input.now.getTime() - 7 * 86400000);
  if (
    (!input.lastCallDate || input.lastCallDate < sevenDaysAgo) &&
    input.hasAgent
  ) {
    out.push({
      id: "no-call-week",
      text: "You have not started a call this week. Try a template.",
      href: "/agents",
    });
  }
  if (input.avgReplyMs !== null && input.avgReplyMs > 6000 && input.voiceInteractions >= 5) {
    out.push({
      id: "slow-replies",
      text: `Replies take about ${(input.avgReplyMs / 1000).toFixed(1)} s on average. Shorter agent instructions can help.`,
    });
  }
  if (input.mostUsedAgent && input.mostUsedAgent.count >= 3) {
    out.push({
      id: "most-used",
      text: `${input.mostUsedAgent.name} is your most used agent.`,
    });
  }
  if (out.length === 0) {
    out.push({ id: "caught-up", text: "You are all caught up." });
  }
  return out.slice(0, 3);
}

export function parseTextMetric(v: string | null | undefined): number | null {
  if (!v) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n;
}