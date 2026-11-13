import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { createTRPCContext } from '../../../../trpc/init';
import { appRouter } from '../../../../trpc/routers/_app';

// Summaries (retrySummary/endCall) can run with provider backoff; allow headroom.
export const maxDuration = 60;
 
const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: createTRPCContext,
  });
 
export { handler as GET, handler as POST };