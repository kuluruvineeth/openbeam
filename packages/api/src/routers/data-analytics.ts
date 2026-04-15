import {
  countSearchImpressions,
  getDailyUsageForPeriod,
  getTeamConnectorsSummary,
  getTeamUsageSummary,
  getTopCostDrivers,
} from "@openbeam/db";
import { z } from "zod";
import { createTRPCRouter } from "../index";
import { withActiveTeam } from "./apps/middleware";

export const dataAnalyticsRouter = createTRPCRouter({
  overview: withActiveTeam
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const endDate = input.endDate ? new Date(input.endDate) : new Date();
      const startDate = input.startDate
        ? new Date(input.startDate)
        : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [aiUsage, connectorSummary] = await Promise.all([
        getTeamUsageSummary(ctx.prisma, ctx.teamId, startDate, endDate),
        getTeamConnectorsSummary(ctx.prisma, ctx.teamId),
      ]);

      const searchCount = await countSearchImpressions(
        ctx.prisma,
        ctx.teamId,
        startDate,
        endDate
      );

      return {
        searchCount,
        aiRequestCount: aiUsage.totals.requests,
        aiTotalCost: aiUsage.totals.totalCostUsd,
        totalDocuments: connectorSummary.totalDocuments,
        activeConnectors: connectorSummary.activeConnectors,
        totalConnectors: connectorSummary.totalConnectors,
      };
    }),

  searchVolume: withActiveTeam
    .input(
      z.object({
        days: z.number().min(1).max(90).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      const since = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);

      const impressions = await ctx.prisma.searchImpression.groupBy({
        by: ["createdAt"],
        where: {
          teamId: ctx.teamId,
          createdAt: { gte: since },
        },
        _count: true,
        orderBy: { createdAt: "asc" },
      });

      const dailyCounts = new Map<string, number>();
      for (const row of impressions) {
        const day = row.createdAt.toISOString().slice(0, 10);
        dailyCounts.set(day, (dailyCounts.get(day) ?? 0) + row._count);
      }

      return [...dailyCounts.entries()].map(([date, count]) => ({
        date,
        queries: count,
      }));
    }),

  aiUsageTrend: withActiveTeam
    .input(
      z.object({
        days: z.number().min(1).max(90).default(30),
      })
    )
    .query(({ ctx, input }) => {
      const endDate = new Date();
      const startDate = new Date(
        endDate.getTime() - input.days * 24 * 60 * 60 * 1000
      );

      return getDailyUsageForPeriod(ctx.prisma, ctx.teamId, startDate, endDate);
    }),

  topCostDrivers: withActiveTeam
    .input(
      z.object({
        days: z.number().min(1).max(90).default(30),
        limit: z.number().min(1).max(20).default(5),
      })
    )
    .query(({ ctx, input }) => {
      const endDate = new Date();
      const startDate = new Date(
        endDate.getTime() - input.days * 24 * 60 * 60 * 1000
      );

      return getTopCostDrivers(ctx.prisma, {
        teamId: ctx.teamId,
        startDate,
        endDate,
        limit: input.limit,
      });
    }),

  connectorHealth: withActiveTeam.query(({ ctx }) =>
    getTeamConnectorsSummary(ctx.prisma, ctx.teamId)
  ),
});
