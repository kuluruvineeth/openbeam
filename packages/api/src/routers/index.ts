import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { createTRPCRouter } from "../index";

import { appsRouter } from "./apps";
import { organizationRouter } from "./organization";
import { userRouter } from "./user";

export const appRouter = createTRPCRouter({
  organization: organizationRouter,
  user: userRouter,
  apps: appsRouter,
});

export type AppRouter = typeof appRouter;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type RouterInputs = inferRouterInputs<AppRouter>;
