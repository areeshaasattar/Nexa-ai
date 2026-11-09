import { nanoid } from "nanoid";
import {
  AGENT_TEMPLATES,
  STARTER_AGENT_TEMPLATE_ID,
  getAgentTemplate,
} from "@/lib/agent-templates";

export type StarterAgentValues = {
  id: string;
  name: string;
  instruction: string;
  userId: string;
};

export function buildStarterAgentValues(userId: string): StarterAgentValues {
  const template = getAgentTemplate(STARTER_AGENT_TEMPLATE_ID);
  if (!template) {
    throw new Error(`Starter agent template not found: ${STARTER_AGENT_TEMPLATE_ID}`);
  }

  return {
    id: nanoid(),
    name: template.name,
    instruction: template.instruction,
    userId,
  };
}

export async function seedStarterAgent(userId: string): Promise<void> {
  try {
    // Lazy imports so buildStarterAgentValues (and this module) stay testable
    // without a DATABASE_URL; neon-http does not support interactive transactions.
    const { eq } = await import("drizzle-orm");
    const { db } = await import("@/db");
    const { agents, activities } = await import("@/db/schema");

    const existing = await db
      .select({ id: agents.id })
      .from(agents)
      .where(eq(agents.userId, userId))
      .limit(1);

    if (existing.length > 0) {
      console.info(
        JSON.stringify({
          event: "seed.starter_agent.skipped",
          userId,
          reason: "agent_exists",
        }),
      );
      return;
    }

    const values = buildStarterAgentValues(userId);

    await db.insert(agents).values({
      id: values.id,
      name: values.name,
      instruction: values.instruction,
      userId: values.userId,
    });

    await db.insert(activities).values({
      userId,
      type: "agent_created",
      title: `Agent Created: ${values.name}`,
      description: `Your starter AI agent "${values.name}" has been deployed to your workspace so you can start a meeting right away.`,
    });

    console.info(
      JSON.stringify({
        event: "seed.starter_agent.created",
        userId,
        agentId: values.id,
      }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.error(
      JSON.stringify({
        event: "seed.starter_agent.failed",
        userId,
        message,
      }),
    );
  }
}

// Re-export for convenience where only the template is needed.
export { AGENT_TEMPLATES, STARTER_AGENT_TEMPLATE_ID };
