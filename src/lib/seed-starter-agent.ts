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
  sleep?: (ms: number) => Promise<void>;
};

const DEFAULT_RETRY_DELAYS_MS = [300, 800, 1500] as const;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const getErrorCode = (error: unknown): string | undefined => {
  if (!error || typeof error !== "object") return undefined;
  const cause =
    "cause" in error
      ? (error as { cause?: { code?: unknown; message?: unknown } }).cause
      : undefined;
  if (cause && typeof cause === "object" && typeof (cause as { code?: unknown }).code === "string") {
    return (cause as { code: string }).code;
  }
  if ("code" in error && typeof (error as { code?: unknown }).code === "string") {
    return (error as { code: string }).code;
  }
  return undefined;
};

async function trySeedStarterAgent(
  userId: string,
  deps: SeedDeps,
): Promise<{ status: "created" | "skipped"; agentId?: string }> {
  const existing = await deps.db
    .select({ id: deps.agents.id })
    .from(deps.agents)
    .where(deps.eq(deps.agents.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    return { status: "skipped" };
  }

  const values = buildStarterAgentValues(userId);
  const now = new Date();

  await deps.db.insert(deps.agents).values({
    id: values.id,
    name: values.name,
    instruction: values.instruction,
    userId: values.userId,
    createdAt: now,
    updatedAt: now,
  });

  await deps.db.insert(deps.activities).values({
    userId,
    type: "agent_created",
    title: `Agent Created: ${values.name}`,
    description: `Your starter AI agent "${values.name}" has been deployed to your workspace so you can start a meeting right away.`,
    createdAt: now,
  });

  return { status: "created", agentId: values.id };
}

/**
 * Seeds the default starter agent for a user. Idempotent: no-op if the user
 * already has an agent. Retries on Postgres FK 23503 (user row not yet
 * visible/committed) with short backoff. Never throws and never blocks signup.
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

    const wait = resolvedDeps.sleep ?? sleep;
    const retryDelays = DEFAULT_RETRY_DELAYS_MS;
    let attempt = 1;
    let lastError: unknown;

    while (attempt <= retryDelays.length + 1) {
      try {
        const result = await trySeedStarterAgent(userId, resolvedDeps);
        if (result.status === "created") {
          console.info(
            JSON.stringify({
              event: "seed.starter_agent.created",
              userId,
              agentId: result.agentId,
              attempt,
            }),
          );
        }
        return;
      } catch (error) {
        lastError = error;
        const code = getErrorCode(error);

        if (code === "23503" && attempt <= retryDelays.length) {
          await wait(retryDelays[attempt - 1]!);
          attempt += 1;
          continue;
        }

        console.error(
          JSON.stringify({
            event: "seed.starter_agent.failed",
            userId,
            code: code ?? "unknown",
          }),
        );
        return;
      }
    }

    console.error(
      JSON.stringify({
        event: "seed.starter_agent.failed",
        userId,
        code: getErrorCode(lastError) ?? "unknown",
      }),
    );
  } catch {
    console.error(
      JSON.stringify({
        event: "seed.starter_agent.failed",
        userId,
        code: "unknown",
      }),
    );
  }
}

// Re-export for convenience where only the template is needed.
export { AGENT_TEMPLATES, STARTER_AGENT_TEMPLATE_ID };
