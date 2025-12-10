import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { createTRPCRouter } from "../index";

import { appsRouter } from "./apps";
import { filesRouter } from "./files";
import { searchRouter } from "./search";
import { teamRouter } from "./team";
import { userRouter } from "./user";
import { videoRouter } from "./video";

export const appRouter = createTRPCRouter({
  team: teamRouter,
  user: userRouter,
  apps: appsRouter,
  search: searchRouter,
  files: filesRouter,
  video: videoRouter,
});

export type AppRouter = typeof appRouter;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type RouterInputs = inferRouterInputs<AppRouter>;
