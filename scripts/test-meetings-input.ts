import assert from "node:assert/strict";
import { meetingsInsertSchema, meetingsUpdateSchema, assertScheduledAtNotPast } from "../src/modules/meetings/schemas";
import { assertAgentOwned, AgentNotOwnedError } from "../src/lib/agent-ownership";
import { evaluateMeetingUpdate } from "../src/lib/meeting-update-decision";

let passed = 0;
let failed = 0;
function test(name: string, fn: () => void | Promise<void>) {
  try {
    const r = fn();
    if (r && typeof (r as Promise<void>).then === "function") {
      (r as Promise<void>).then(() => { passed++; console.log("PASS", name); }).catch((e) => { failed++; console.error("FAIL", name, e?.message ?? e); });
      return;
    }
    passed++;
    console.log("PASS", name);
  } catch (e) {
    failed++;
    console.error("FAIL", name, (e as Error)?.message ?? e);
  }
}

const forbidden = ["status", "startedAt", "endedAt", "transcriptUrl", "recordingUrl", "summary", "summaryData", "summarySource", "summaryError", "summaryEmailSentAt", "userId"];

for (const key of forbidden) {
  test(`create rejects forbidden key: ${key}`, () => {
    const data: Record<string, unknown> = { name: "m", agentId: "a", [key]: "x" };
    const r = meetingsInsertSchema.safeParse(data);
    assert.equal(r.success, false);
  });
  test(`update rejects forbidden key: ${key}`, () => {
    const data: Record<string, unknown> = { id: "i", [key]: "x" };
    const r = meetingsUpdateSchema.safeParse(data);
    assert.equal(r.success, false);
  });
}

test("create rejects id", () => {
  const r = meetingsInsertSchema.safeParse({ name: "m", agentId: "a", id: "x" });
  assert.equal(r.success, false);
});

// scheduledAtSchema
test("scheduledAt accepts near-future", () => {
  const r = meetingsInsertSchema.safeParse({ name: "m", agentId: "a", scheduledAt: new Date(Date.now() + 60000) });
  assert.equal(r.success, true);
});
test("scheduledAt accepts null", () => {
  const r = meetingsInsertSchema.safeParse({ name: "m", agentId: "a", scheduledAt: null });
  assert.equal(r.success, true);
  if (r.success) assert.equal(r.data.scheduledAt, null);
});
test("scheduledAt accepts omitted", () => {
  const r = meetingsInsertSchema.safeParse({ name: "m", agentId: "a" });
  assert.equal(r.success, true);
});
test("scheduledAt rejects >1 year ahead", () => {
  const r = meetingsInsertSchema.safeParse({ name: "m", agentId: "a", scheduledAt: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000) });
  assert.equal(r.success, false);
});
test("scheduledAt rejects invalid string", () => {
  const r = meetingsInsertSchema.safeParse({ name: "m", agentId: "a", scheduledAt: "not-a-date" });
  assert.equal(r.success, false);
});
test("scheduledAt null stays null (no coercion to 1970)", () => {
  const r = meetingsInsertSchema.safeParse({ name: "m", agentId: "a", scheduledAt: null });
  assert.equal(r.success, true);
  if (r.success) assert.notEqual(r.data.scheduledAt?.getTime?.(), 0);
});

// assertScheduledAtNotPast
test("assertScheduledAtNotPast accepts now-4min", () => {
  assertScheduledAtNotPast(new Date(Date.now() - 4 * 60 * 1000));
});
test("assertScheduledAtNotPast rejects now-6min", () => {
  let threw = false;
  try { assertScheduledAtNotPast(new Date(Date.now() - 6 * 60 * 1000)); } catch { threw = true; }
  assert.equal(threw, true);
});

// ownership helper
test("assertAgentOwned passes for owned", async () => {
  await assertAgentOwned("u1", "a1", async () => true);
});
test("assertAgentOwned throws NOT_FOUND for foreign", async () => {
  let err: unknown;
  try { await assertAgentOwned("u1", "a2", async () => false); } catch (e) { err = e; }
  assert.ok(err instanceof AgentNotOwnedError);
  assert.equal((err as Error).message, "NOT_FOUND");
});
test("assertAgentOwned throws NOT_FOUND for nonexistent", async () => {
  let err: unknown;
  try { await assertAgentOwned("u1", "nope", async () => false); } catch (e) { err = e; }
  assert.ok(err instanceof AgentNotOwnedError);
  assert.equal((err as Error).message, "NOT_FOUND");
});

test("update decision: noop when unchanged", () => {
  const stored = { id: "i", status: "scheduled", agentId: "a", scheduledAt: new Date("2026-01-01T00:00:00Z"), name: "m", instructions: null };
  const d = evaluateMeetingUpdate(stored, { name: "m", agentId: "a", scheduledAt: new Date("2026-01-01T00:00:00Z") });
  assert.equal(d.kind, "noop");
});
test("update decision: agentId change on ongoing rejected", () => {
  const stored = { id: "i", status: "ongoing", agentId: "a", scheduledAt: null, name: "m", instructions: null };
  const d = evaluateMeetingUpdate(stored, { agentId: "b" });
  assert.equal(d.kind, "error");
});
test("update decision: scheduledAt change on completed rejected", () => {
  const stored = { id: "i", status: "completed", agentId: "a", scheduledAt: null, name: "m", instructions: null };
  const d = evaluateMeetingUpdate(stored, { scheduledAt: new Date() });
  assert.equal(d.kind, "error");
});
test("update decision: name change on completed allowed", () => {
  const stored = { id: "i", status: "completed", agentId: "a", scheduledAt: null, name: "m", instructions: null };
  const d = evaluateMeetingUpdate(stored, { name: "new" });
  assert.equal(d.kind, "updates");
});

test("update decision: name-only on completed with scheduledAt set allowed, no schedule change", () => {
  const stored = { id: "i", status: "completed", agentId: "a", scheduledAt: new Date("2026-01-01T00:00:00Z"), name: "m", instructions: null };
  const d = evaluateMeetingUpdate(stored, { name: "new" });
  assert.equal(d.kind, "updates");
  if (d.kind === "updates") assert.equal(d.data.scheduledAt, undefined);
});

test("update decision: explicit null scheduledAt on scheduled clears it", () => {
  const stored = { id: "i", status: "scheduled", agentId: "a", scheduledAt: new Date("2026-01-01T00:00:00Z"), name: "m", instructions: null };
  const d = evaluateMeetingUpdate(stored, { scheduledAt: null });
  assert.equal(d.kind, "updates");
  if (d.kind === "updates") assert.equal(d.data.scheduledAt, null);
});

test("update decision: explicit null scheduledAt on completed with stored set -> BAD_REQUEST", () => {
  const stored = { id: "i", status: "completed", agentId: "a", scheduledAt: new Date("2026-01-01T00:00:00Z"), name: "m", instructions: null };
  const d = evaluateMeetingUpdate(stored, { scheduledAt: null });
  assert.equal(d.kind, "error");
});

test("update decision: explicit null when stored already null -> noop", () => {
  const stored = { id: "i", status: "scheduled", agentId: "a", scheduledAt: null, name: "m", instructions: null };
  const d = evaluateMeetingUpdate(stored, { scheduledAt: null });
  assert.equal(d.kind, "noop");
});

test("update decision: agentId omitted -> not a change", () => {
  const stored = { id: "i", status: "scheduled", agentId: "a", scheduledAt: null, name: "m", instructions: null };
  const d = evaluateMeetingUpdate(stored, { name: "m" });
  assert.equal(d.kind, "noop");
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;