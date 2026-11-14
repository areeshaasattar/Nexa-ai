import { agentsRouter } from "@/modules/agents/server/procedures";
import { meetingsRouter } from "@/modules/meetings/server/procedures";
import { homeRouter } from "@/modules/home/server/procedures";
import { feedbackRouter } from "@/modules/feedback/server/procedures";

import { createTRPCRouter } from "../init";

export const appRouter = createTRPCRouter({
  hello: homeRouter.hello,
  getDashboardData: homeRouter.getDashboardData,
  getSystemHealth: homeRouter.getSystemHealth,
  getOnboarding: homeRouter.getOnboarding,
  agents: agentsRouter,
  meetings: meetingsRouter,
  feedback: feedbackRouter,
});


export type AppRouter = typeof appRouter;