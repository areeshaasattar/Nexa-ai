import { initTRPC, TRPCError } from '@trpc/server';
import { cache } from 'react';
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

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

import superjson from "superjson";

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
