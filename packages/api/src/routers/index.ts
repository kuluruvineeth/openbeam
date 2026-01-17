import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { createTRPCRouter } from "../index";

import { agentCanvasRouter } from "./agent-canvas";
import { aiRouter } from "./ai";
import { analyticsRouter } from "./analytics";
import { appsRouter } from "./apps";
import { backgroundAgentsRouter } from "./background-agents";
import { filesRouter } from "./files";
import { jobsRouter } from "./jobs";
import { knowledgeRouter } from "./knowledge";
import { mediaRouter } from "./media";
import { messagesRouter } from "./messages";
import { overviewRouter } from "./overview";
import { permissionsRouter } from "./permissions";
import { personalizationRouter } from "./personalization";
import { ragRouter } from "./rag";
import { searchRouter } from "./search";
import { teamRouter } from "./team";
import { userRouter } from "./user";

export const appRouter = createTRPCRouter({
  agentCanvas: agentCanvasRouter,
  ai: aiRouter,
  analytics: analyticsRouter,
  apps: appsRouter,
  backgroundAgents: backgroundAgentsRouter,
  files: filesRouter,
  jobs: jobsRouter,
  knowledge: knowledgeRouter,
  media: mediaRouter,
  messages: messagesRouter,
  overview: overviewRouter,
  permissions: permissionsRouter,
  personalization: personalizationRouter,
  rag: ragRouter,
  search: searchRouter,
  team: teamRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type RouterInputs = inferRouterInputs<AppRouter>;
