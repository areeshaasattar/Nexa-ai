import assert from "node:assert/strict";
import {
  buildStarterAgentValues,
  seedStarterAgent,
  type SeedDeps,
} from "../src/lib/seed-starter-agent";
import { agentsInsertSchema } from "../src/modules/agents/schemas";

type InsertCall = { table: "agents" | "activities"; values: unknown };

function createDbStub(opts?: { failAgentInsertTimes?: number; alwaysFailCode?: string }) {
  const calls: InsertCall[] = [];
  let agentInsertAttempts = 0;
  let activitiesInserted = 0;
  const agentsTable = { kind: "agents", id: "agents.id", userId: "agents.user_id" };
  const activitiesTable = { kind: "activities" };

  const db: SeedDeps["db"] = {
    select: () => ({
      from: () => ({
        where: () => ({
          // Idempotency guard: always report no existing agent in these tests.
          limit: async () => [] as Array<{ id: string }>,
        }),
      }),
    }),
    insert: (table: unknown) => ({
      values: async (values: unknown) => {
        if (table === agentsTable) {
          calls.push({ table: "agents", values });
          agentInsertAttempts += 1;
          if (opts?.alwaysFailCode) {
            const err = new Error("insert failed") as Error & { code?: string };
            err.code = opts.alwaysFailCode;
            throw err;
          }
          const failTimes = opts?.failAgentInsertTimes ?? 0;
          if (agentInsertAttempts <= failTimes) {
            const err = new Error("fk violation") as Error & { cause?: { code: string } };
            err.cause = { code: "23503" };
            throw err;
          }
          return;
        }
        if (table === activitiesTable) {
          calls.push({ table: "activities", values });
          activitiesInserted += 1;
          return;
        }
        throw new Error("unexpected table");
      },
    }),
  };

  return {
    deps: {
      db,
      agents: agentsTable,
      activities: activitiesTable,
      eq: (left: unknown, right: unknown) => ({ left, right }),
      sleep: async () => {},
    } satisfies SeedDeps,
    calls,
    get agentInsertAttempts() {
      return agentInsertAttempts;
    },
    get activitiesInserted() {
      return activitiesInserted;
    },
  };
}

async function main() {
  // Existing value/validation checks
  const values = buildStarterAgentValues("u1");

  assert.equal(values.name, "Brainstorm Partner", "name must match starter template");
  assert.equal(typeof values.instruction, "string");
  assert.ok(values.instruction.trim().length > 0, "instruction must be non-empty");
  assert.equal(values.userId, "u1", "userId must be preserved");
  assert.equal(typeof values.id, "string");
  assert.ok(values.id.trim().length > 0, "id must be non-empty");
  assert.ok(!/[#*`]/.test(values.instruction), "instruction must not contain #, *, or backticks");

  const schemaResult = agentsInsertSchema.omit({ userId: true }).safeParse({
    name: values.name,
    instruction: values.instruction,
  });
  assert.equal(schemaResult.success, true, "name/instruction must satisfy existing agent validation");

  // Retry: fails with 23503 twice, then succeeds => 3 agent-insert attempts, one agent created.
  {
    const stub = createDbStub({ failAgentInsertTimes: 2 });
    await seedStarterAgent("user-retry-ok", stub.deps);
    assert.equal(stub.agentInsertAttempts, 3, "expected exactly 3 agent insert attempts");
    assert.equal(stub.activitiesInserted, 1, "expected one activity created on success");
  }

  // Always fails with 23503 => retries exhausted (4 attempts total), no throw.
  {
    const stub = createDbStub({ alwaysFailCode: "23503" });
    await assert.doesNotReject(async () => {
      await seedStarterAgent("user-retry-fail", stub.deps);
    });
    assert.equal(stub.agentInsertAttempts, 4, "expected 4 agent insert attempts (1 + 3 retries)");
    assert.equal(stub.activitiesInserted, 0, "expected no activity created on final failure");
  }

  // Non-23503 error => single attempt, no throw.
  {
    const stub = createDbStub({ alwaysFailCode: "42P01" });
    await assert.doesNotReject(async () => {
      await seedStarterAgent("user-non-fk-fail", stub.deps);
    });
    assert.equal(stub.agentInsertAttempts, 1, "expected single attempt for non-23503 errors");
    assert.equal(stub.activitiesInserted, 0, "expected no activity created");
  }

  console.log(
    JSON.stringify(
      {
        event: "test.seed_starter_agent.pass",
        checks: {
          name: values.name,
          userId: values.userId,
          hasId: values.id.length > 0,
          instructionLength: values.instruction.length,
          hasMarkdownMarkers: /[#*`]/.test(values.instruction),
          schemaValid: schemaResult.success,
          schemaMaxLength: "none (agentsInsertSchema has min(1) only)",
          retry23503_then_success: { agentInsertAttempts: 3, activitiesInserted: 1 },
          retry23503_always_fail: { agentInsertAttempts: 4, activitiesInserted: 0, threw: false },
          non23503_single_attempt: { agentInsertAttempts: 1, activitiesInserted: 0, threw: false },
        },
      },
      null,
      2,
    ),
  );
}

void main();
