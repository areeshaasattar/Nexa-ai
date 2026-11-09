import assert from "node:assert/strict";
import { buildStarterAgentValues } from "../src/lib/seed-starter-agent";
import { agentsInsertSchema } from "../src/modules/agents/schemas";

function main() {
  const values = buildStarterAgentValues("u1");

  assert.equal(values.name, "Brainstorm Partner", "name must match starter template");
  assert.equal(typeof values.instruction, "string");
  assert.ok(values.instruction.trim().length > 0, "instruction must be non-empty");
  assert.equal(values.userId, "u1", "userId must be preserved");
  assert.equal(typeof values.id, "string");
  assert.ok(values.id.trim().length > 0, "id must be non-empty");

  assert.ok(!/[#*`]/.test(values.instruction), "instruction must not contain #, *, or backticks");

  // agentsInsertSchema enforces min(1) on instruction but has no max length.
  const schemaResult = agentsInsertSchema.omit({ userId: true }).safeParse({
    name: values.name,
    instruction: values.instruction,
  });
  assert.equal(schemaResult.success, true, "name/instruction must satisfy existing agent validation");

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
        },
      },
      null,
      2,
    ),
  );
}

main();
