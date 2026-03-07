import {
  getControlDashboardSummary,
  getControlRecentActivity,
  getControlSidebarBadges,
} from "@openbeam/services";
import { createTRPCRouter } from "../../index";
import { withActiveTeam } from "../apps/middleware";
import { mapControlError } from "./middleware";

export const dashboardRouter = createTRPCRouter({
  summary: withActiveTeam.query(async ({ ctx }) => {
    try {
      return await getControlDashboardSummary(ctx.prisma, ctx.teamId);
    } catch (err) {
      mapControlError(err);
    }
  }),

  sidebarBadges: withActiveTeam.query(async ({ ctx }) => {
    try {
      return await getControlSidebarBadges(ctx.prisma, ctx.teamId);
    } catch (err) {
      mapControlError(err);
    }
  }),

  recentActivity: withActiveTeam.query(async ({ ctx }) => {
    try {
      return await getControlRecentActivity(ctx.prisma, ctx.teamId);
    } catch (err) {
      mapControlError(err);
    }
  }),
});
