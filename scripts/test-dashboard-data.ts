import assert from "node:assert/strict";
import {
  computeTrend,
  fillBuckets,
  buildStatusBreakdown,
  buildInsights,
  parseTextMetric,
} from "../src/modules/home/lib/dashboard-data";

async function main() {
  // computeTrend
  assert.deepEqual(computeTrend(10, 5), { percent: 100, label: "up" });
  assert.deepEqual(computeTrend(5, 10), { percent: -50, label: "down" });
  assert.deepEqual(computeTrend(5, 0), { percent: null, label: "new" });
  assert.deepEqual(computeTrend(0, 0), { percent: null, label: "none" });
  assert.deepEqual(computeTrend(0, 5), { percent: -100, label: "down" });
  const t = computeTrend(1, 0);
  assert.ok(!Number.isNaN(t.percent === null ? 0 : t.percent));

  // fillBuckets 7d
  const now = new Date("2026-11-14T12:00:00Z");
  const b7 = fillBuckets([{ date: "2026-11-14", count: 2 }], [], "7d", now);
  assert.equal(b7.length, 7);
  assert.equal(b7[b7.length - 1].meetings, 2);
  assert.equal(b7[0].meetings, 0);

  // fillBuckets 30d
  const b30 = fillBuckets([], [], "30d", now);
  assert.equal(b30.length, 30);

  // fillBuckets 12m
  const b12 = fillBuckets([], [], "12m", now);
  assert.equal(b12.length, 12);

  // buildStatusBreakdown sum to 100
  const s1 = buildStatusBreakdown({ completed: 1, ongoing: 1, scheduled: 1 });
  const sum1 = s1.percentages.completed + s1.percentages.ongoing + s1.percentages.scheduled;
  assert.equal(sum1, 100);
  const s0 = buildStatusBreakdown({ completed: 0, ongoing: 0, scheduled: 0 });
  assert.equal(s0.total, 0);
  assert.equal(s0.percentages.completed + s0.percentages.ongoing + s0.percentages.scheduled, 0);

  // buildInsights
  const ins = buildInsights({
    completedWithoutSummary: 2,
    oldestCompletedWithoutSummaryId: "m1",
    scheduledCount: 1,
    lastCallDate: null,
    hasAgent: true,
    avgReplyMs: 7000,
    voiceInteractions: 6,
    mostUsedAgent: { name: "Bot", count: 4 },
    now,
  });
  assert.ok(ins.length <= 3);
  assert.ok(ins.some((i) => i.id === "missing-summary"));

  const caughtUp = buildInsights({
    completedWithoutSummary: 0,
    oldestCompletedWithoutSummaryId: null,
    scheduledCount: 0,
    lastCallDate: now,
    hasAgent: false,
    avgReplyMs: null,
    voiceInteractions: 0,
    mostUsedAgent: null,
    now,
  });
  assert.equal(caughtUp[0].id, "caught-up");

  // parseTextMetric
  assert.equal(parseTextMetric("123"), 123);
  assert.equal(parseTextMetric(""), null);
  assert.equal(parseTextMetric("abc"), null);
  assert.equal(parseTextMetric(null), null);

  console.log("test:dashboard-data passed");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});