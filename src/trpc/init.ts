import { initTRPC, TRPCError } from "@trpc/server";
import { cache } from "react";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import superjson from "superjson";
import { checkLimit, type RateLimitName } from "@/lib/rate-limit";

export const createTRPCContext = cache(async () => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    return { userId: session?.user.id };
  } catch (error) {
    console.error("Failed to get session in tRPC context:", error);
    return { userId: undefined };
  }
});

const t = initTRPC.context<{ userId: string | undefined }>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const baseProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
    },
  });
});

function formatRetryAfter(seconds: number): string {
  if (seconds <= 90) return `about ${Math.max(1, Math.ceil(seconds))} seconds`;
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `about ${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.ceil(minutes / 60);
  return `about ${hours} hour${hours === 1 ? "" : "s"}`;
}

/**
 * Builds a rate-limited middleware for protected procedures.
 * Keyed by authenticated userId by default, or by a custom key derived from input.
 */
export function rateLimited(
  name: RateLimitName,
  getKey?: (ctx: { userId: string }, input: unknown) => string,
) {
  return t.middleware(async ({ ctx, input, next }) => {
    if (!ctx.userId) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    const key = getKey ? getKey({ userId: ctx.userId }, input) : ctx.userId;
    const result = await checkLimit(name, key);
    if (!result.allowed) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: `Too many requests. Try again in ${formatRetryAfter(result.retryAfterSeconds)}.`,
      });
    }
    return next({ ctx: { ...ctx, userId: ctx.userId } });
  });
}
