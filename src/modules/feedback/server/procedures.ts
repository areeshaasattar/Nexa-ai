import { db } from "@/db";
import { feedback, user } from "@/db/schema";
import { createTRPCRouter, protectedProcedure, rateLimited } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { LIMITS } from "@/lib/limits";

const feedbackType = ["bug", "idea", "other"] as const;
const feedbackStatus = ["new", "reviewed", "resolved"] as const;

function isAdmin(email: string | null | undefined): boolean {
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return !!email && admins.includes(email.toLowerCase());
}

export const feedbackRouter = createTRPCRouter({
  create: protectedProcedure
    .use(rateLimited("feedback.create.hour"))
    .input(
      z.object({
        type: z.enum(feedbackType),
        message: z
          .string()
          .trim()
          .min(LIMITS.textCaps.feedbackMessageMin)
          .max(LIMITS.textCaps.feedbackMessageMax),
        rating: z.number().int().min(1).max(5).optional(),
        pageUrl: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await db
        .insert(feedback)
        .values({
          userId: ctx.userId,
          type: input.type,
          message: input.message,
          rating: input.rating ?? null,
          pageUrl: input.pageUrl ?? null,
        })
        .returning({ id: feedback.id });
      return { id: row.id };
    }),

  // Admin-only: list all feedback newest first.
  list: protectedProcedure.query(async ({ ctx }) => {
    const [u] = await db
      .select({ email: user.email })
      .from(user)
      .where(eq(user.id, ctx.userId));
    if (!isAdmin(u?.email)) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }
    return db
      .select({
        id: feedback.id,
        type: feedback.type,
        message: feedback.message,
        rating: feedback.rating,
        pageUrl: feedback.pageUrl,
        status: feedback.status,
        createdAt: feedback.createdAt,
        userName: user.name,
        userEmail: user.email,
      })
      .from(feedback)
      .leftJoin(user, eq(feedback.userId, user.id))
      .orderBy(desc(feedback.createdAt));
  }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(feedbackStatus),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [u] = await db
        .select({ email: user.email })
        .from(user)
        .where(eq(user.id, ctx.userId));
      if (!isAdmin(u?.email)) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      const [updated] = await db
        .update(feedback)
        .set({ status: input.status })
        .where(eq(feedback.id, input.id))
        .returning({ id: feedback.id });
      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return { success: true };
    }),
});