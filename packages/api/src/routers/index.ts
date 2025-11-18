import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { createTRPCRouter } from "../index";

import { organizationRouter } from "./organization";
import { userRouter } from "./user";

export const appRouter = createTRPCRouter({
  organization: organizationRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type RouterInputs = inferRouterInputs<AppRouter>;
