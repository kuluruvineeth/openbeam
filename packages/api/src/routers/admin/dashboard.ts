import { getDashboardMetrics } from "@openbeam/db";
import { createTRPCRouter } from "../../index";
import { withAdminRole } from "../apps/middleware";

export const adminDashboardRouter = createTRPCRouter({
  metrics: withAdminRole.query(async ({ ctx }) =>
    getDashboardMetrics(ctx.prisma, ctx.teamId)
  ),
});
