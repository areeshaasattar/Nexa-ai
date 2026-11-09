import dotenv from "dotenv";

dotenv.config();

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  // Dynamic imports after dotenv so DATABASE_URL is available when db initializes.
  const { db } = await import("../src/db");
  const { user, agents } = await import("../src/db/schema");
  const { seedStarterAgent } = await import("../src/lib/seed-starter-agent");
  const { sql } = await import("drizzle-orm");

  const usersWithoutAgents = await db
    .select({ id: user.id })
    .from(user)
    .where(
      sql`NOT EXISTS (SELECT 1 FROM ${agents} a WHERE a.user_id = ${user.id})`,
    );

  if (dryRun) {
    console.log(
      JSON.stringify({
        event: "seed.starter_agent.backfill.dry_run",
        usersWithoutAgents: usersWithoutAgents.length,
      }),
    );
    return;
  }

  let seeded = 0;
  let failed = 0;
  for (const row of usersWithoutAgents) {
    await seedStarterAgent(row.id);
    // seedStarterAgent logs per-user status and never throws; count successes
    // by checking whether the user now has an agent.
    const [hasAgent] = await db
      .select({ id: agents.id })
      .from(agents)
      .where(sql`${agents.userId} = ${row.id}`)
      .limit(1);
    if (hasAgent) seeded += 1;
    else failed += 1;
  }

  console.log(
    JSON.stringify({
      event: "seed.starter_agent.backfill.complete",
      usersProcessed: usersWithoutAgents.length,
      seeded,
      failed,
      dryRun: false,
    }),
  );
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : "unknown error";
  console.error(
    JSON.stringify({ event: "seed.starter_agent.backfill.failed", message }),
  );
  process.exitCode = 1;
});
