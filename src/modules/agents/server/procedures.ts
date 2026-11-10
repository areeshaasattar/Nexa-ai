import { db } from "@/db";
import { agents, meetings, activities } from "@/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { agentsInsertSchema, agentsUpdateSchema } from "../schemas";
import { z } from "zod";
import { eq, sql, or, ilike, desc, count, and } from "drizzle-orm";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from "@/constants";
import { TRPCError } from "@trpc/server";
import { LIMITS } from "@/lib/limits";

export const agentsRouter = createTRPCRouter({
  getMany: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(DEFAULT_PAGE),
        pageSize: z.number().min(1).max(100).default(DEFAULT_PAGE_SIZE),
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize, search } = input;
      const offset = (page - 1) * pageSize;

      const filters = [eq(agents.userId, ctx.userId)];

      if (search) {
        filters.push(
          or(
            ilike(agents.name, `%${search}%`),
            ilike(agents.instruction, `%${search}%`),
          )!,
        );
      }

      const whereClause = and(...filters);

      const dataPromise = db
        .select({
          id: agents.id,
          name: agents.name,
          userId: agents.userId,
          instruction: agents.instruction,
          createdAt: agents.createdAt,
          updatedAt: agents.updatedAt,
          meetingCount: sql<number>`count(${meetings.id})::int`,
        })
        .from(agents)
        .leftJoin(meetings, eq(agents.id, meetings.agentId))
        .where(whereClause)
        .groupBy(agents.id)
        .orderBy(desc(agents.createdAt))
        .limit(pageSize)
        .offset(offset);

      const countPromise = db
        .select({ total: count() })
        .from(agents)
        .where(whereClause);

      const [data, [totalCount]] = await Promise.all([
        dataPromise,
        countPromise,
      ]);

      const total = totalCount.total;

      return {
        data,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }),
  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [agent] = await db
        .select({
          id: agents.id,
          name: agents.name,
          userId: agents.userId,
          instruction: agents.instruction,
          createdAt: agents.createdAt,
          updatedAt: agents.updatedAt,
          meetingCount: sql<number>`count(${meetings.id})::int`,
        })
        .from(agents)
        .leftJoin(meetings, eq(agents.id, meetings.agentId))
        .where(and(eq(agents.id, input.id), eq(agents.userId, ctx.userId)))
        .groupBy(agents.id);

      return agent || null;
    }),
  create: protectedProcedure
    .input(agentsInsertSchema.omit({ userId: true }))
    .mutation(async ({ ctx, input }) => {
      // Quota check (count-then-insert; small race acceptable on neon-http).
      const [existing] = await db
        .select({ total: count() })
        .from(agents)
        .where(eq(agents.userId, ctx.userId));

      if ((existing?.total ?? 0) >= LIMITS.quotas.maxAgentsPerUser) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `You reached the limit of ${LIMITS.quotas.maxAgentsPerUser} agents. Delete one to create another.`,
        });
      }

      const [newAgent] = await db
        .insert(agents)
        .values({
          name: input.name,
          instruction: input.instruction,
          userId: ctx.userId,
        })
        .returning();

      await db.insert(activities).values({
        userId: ctx.userId,
        type: "agent_created",
        title: `Agent Created: ${newAgent.name}`,
        description: `A new AI agent "${newAgent.name}" has been deployed to your workspace.`,
      });

      return newAgent;
    }),
  update: protectedProcedure
    .input(agentsUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [updatedAgent] = await db
        .update(agents)
        .set(data)
        .where(and(eq(agents.id, id), eq(agents.userId, ctx.userId)))
        .returning();

      if (updatedAgent) {
        await db.insert(activities).values({
          userId: ctx.userId,
          type: "agent_updated",
          title: `Agent Updated: ${updatedAgent.name}`,
          description: `The configuration for agent "${updatedAgent.name}" has been updated.`,
        });
      }

      return updatedAgent || null;
    }),
  remove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [deletedAgent] = await db
        .delete(agents)
        .where(and(eq(agents.id, input.id), eq(agents.userId, ctx.userId)))
        .returning();

      if (deletedAgent) {
        await db.insert(activities).values({
          userId: ctx.userId,
          type: "agent_deleted",
          title: `Agent Deleted: ${deletedAgent.name}`,
          description: `AI agent "${deletedAgent.name}" has been removed from your workspace.`,
        });
      }

      return deletedAgent || null;
    }),
});
