import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { createTRPCRouter } from "../index";

import { analyticsRouter } from "./analytics";
import { appsRouter } from "./apps";
import { filesRouter } from "./files";
import { jobsRouter } from "./jobs";
import { knowledgeRouter } from "./knowledge";
import { mediaRouter } from "./media";
import { messagesRouter } from "./messages";
import { permissionsRouter } from "./permissions";
import { personalizationRouter } from "./personalization";
import { searchRouter } from "./search";
import { teamRouter } from "./team";
import { userRouter } from "./user";

export const appRouter = createTRPCRouter({
  team: teamRouter,
  user: userRouter,
  apps: appsRouter,
  search: searchRouter,
  files: filesRouter,
  media: mediaRouter,
  jobs: jobsRouter,
  messages: messagesRouter,
  analytics: analyticsRouter,
  knowledge: knowledgeRouter,
  permissions: permissionsRouter,
  personalization: personalizationRouter,
});

export type AppRouter = typeof appRouter;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type RouterInputs = inferRouterInputs<AppRouter>;
