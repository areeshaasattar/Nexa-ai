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

export type SeedDeps = {
  db: {
    select: (selection: unknown) => {
      from: (table: unknown) => {
        where: (condition: unknown) => {
          limit: (n: number) => Promise<Array<{ id: string }>>;
        };
      };
    };
    insert: (table: unknown) => {
      values: (values: unknown) => Promise<unknown>;
    };
  };
  agents: { id: unknown; userId: unknown };
  activities: unknown;
  eq: (left: unknown, right: unknown) => unknown;
};

const getErrorCode = (error: unknown): string | undefined => {
  if (!error || typeof error !== "object") return undefined;
  const cause =
    "cause" in error
      ? (error as { cause?: { code?: unknown } }).cause
      : undefined;
  if (cause && typeof cause === "object" && typeof (cause as { code?: unknown }).code === "string") {
    return (cause as { code: string }).code;
  }
  if ("code" in error && typeof (error as { code?: unknown }).code === "string") {
    return (error as { code: string }).code;
  }
  return undefined;
};

/**
 * Seeds the default starter agent for a user. Idempotent: no-op if the user
 * already has an agent. Call from points where the user row is committed
 * (e.g. after email verification, or deferred after response for OAuth/create).
 * Never throws and never blocks signup.
 */
export async function seedStarterAgent(
  userId: string,
  deps?: SeedDeps,
): Promise<void> {
  try {
    let resolvedDeps = deps;
    if (!resolvedDeps) {
      // Lazy imports so buildStarterAgentValues (and this module) stay testable
      // without a DATABASE_URL; neon-http does not support interactive transactions.
      const { eq } = await import("drizzle-orm");
      const { db } = await import("@/db");
      const { agents, activities } = await import("@/db/schema");
      resolvedDeps = { db: db as unknown as SeedDeps["db"], agents, activities, eq };
    }

    const existing = await resolvedDeps.db
      .select({ id: resolvedDeps.agents.id })
      .from(resolvedDeps.agents)
      .where(resolvedDeps.eq(resolvedDeps.agents.userId, userId))
      .limit(1);

    if (existing.length > 0) {
      return;
    }

    const values = buildStarterAgentValues(userId);
    const now = new Date();

    await resolvedDeps.db.insert(resolvedDeps.agents).values({
      id: values.id,
      name: values.name,
      instruction: values.instruction,
      userId: values.userId,
      createdAt: now,
      updatedAt: now,
    });

    await resolvedDeps.db.insert(resolvedDeps.activities).values({
      userId,
      type: "agent_created",
      title: `Agent Created: ${values.name}`,
      description: `Your starter AI agent "${values.name}" has been deployed to your workspace so you can start a meeting right away.`,
      createdAt: now,
    });

    console.info(
      JSON.stringify({
        event: "seed.starter_agent.created",
        userId,
        agentId: values.id,
        attempt: 1,
      }),
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "seed.starter_agent.failed",
        userId,
        code: getErrorCode(error) ?? "unknown",
      }),
    );
  }
}

// Re-export for convenience where only the template is needed.
export { AGENT_TEMPLATES, STARTER_AGENT_TEMPLATE_ID };
