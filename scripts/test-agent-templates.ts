import assert from "node:assert/strict";
import {
  AGENT_TEMPLATES,
  AGENT_TEMPLATE_IDS,
  STARTER_AGENT_TEMPLATE_ID,
  getAgentTemplate,
} from "../src/lib/agent-templates";
import { buildStarterAgentValues } from "../src/lib/seed-starter-agent";

function main() {
  // Exactly five templates, all uniquely identified.
  assert.equal(AGENT_TEMPLATES.length, 5, "expected exactly 5 agent templates");

  const ids = AGENT_TEMPLATES.map((template) => template.id);
  assert.equal(new Set(ids).size, ids.length, "template ids must be unique");
  assert.deepEqual(
    ids,
    [...AGENT_TEMPLATE_IDS],
    "AGENT_TEMPLATE_IDS must match AGENT_TEMPLATES order and ids",
  );

  for (const template of AGENT_TEMPLATES) {
    assert.ok(
      template.name.length >= 1 && template.name.length <= 80,
      `${template.id}: name must be 1-80 characters`,
    );
    assert.ok(
      template.suggestedMeetingName.length >= 1 &&
        template.suggestedMeetingName.length <= 120,
      `${template.id}: suggestedMeetingName must be 1-120 characters`,
    );
    assert.ok(
      template.instruction.trim().length > 0,
      `${template.id}: instruction must be non-empty`,
    );
    assert.ok(
      template.instruction.length <= 4000,
      `${template.id}: instruction must be at most 4000 characters`,
    );
    assert.ok(
      !/[#*`]/.test(template.instruction),
      `${template.id}: instruction must not contain #, *, or backticks`,
    );
    assert.ok(
      template.instruction.includes("text-to-speech"),
      `${template.id}: instruction must mention text-to-speech`,
    );
    assert.equal(
      getAgentTemplate(template.id)?.id,
      template.id,
      `${template.id}: getAgentTemplate must return the template`,
    );
  }

  assert.equal(
    getAgentTemplate("not-a-real-template"),
    undefined,
    "getAgentTemplate must return undefined for unknown ids",
  );

  assert.ok(
    (AGENT_TEMPLATE_IDS as readonly string[]).includes(
      STARTER_AGENT_TEMPLATE_ID,
    ),
    "STARTER_AGENT_TEMPLATE_ID must exist in AGENT_TEMPLATE_IDS",
  );

  // The starter template is already seeded for users: its instruction must
  // stay byte-for-byte identical to what the seeder writes.
  const starterTemplate = getAgentTemplate(STARTER_AGENT_TEMPLATE_ID);
  assert.ok(starterTemplate, "starter template must exist");
  const seederValues = buildStarterAgentValues("test-user");
  assert.equal(
    Buffer.from(seederValues.instruction, "utf8").equals(
      Buffer.from(starterTemplate.instruction, "utf8"),
    ),
    true,
    "Brainstorm Partner instruction must match the starter-agent seeder byte-for-byte",
  );

  console.log(
    JSON.stringify(
      {
        event: "test.agent_templates.pass",
        templates: AGENT_TEMPLATES.map((template) => ({
          id: template.id,
          instructionLength: template.instruction.length,
        })),
      },
      null,
      2,
    ),
  );
}

main();
