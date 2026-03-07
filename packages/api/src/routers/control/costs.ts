import {
  getControlCostByAgentForTeam,
  getControlCostSummaryForTeam,
  listControlCostEventsForTeam,
  recordControlCostEvent,
  updateControlBudgetForTeam,
} from "@openbeam/services";
import { CreateControlCostEventInputSchema } from "@openbeam/types/control/validators/costs";
import { z } from "zod";
import { createTRPCRouter } from "../../index";
import { withActiveTeam } from "../apps/middleware";
import { mapControlError } from "./middleware";

export const costsRouter = createTRPCRouter({
  list: withActiveTeam
    .input(
      z.object({
        agentId: z.string().min(1).optional(),
        limit: z.number().int().positive().optional(),
        offset: z.number().int().nonnegative().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        return await listControlCostEventsForTeam(ctx.prisma, ctx.teamId, {
          agentId: input.agentId,
          limit: input.limit,
        });
      } catch (err) {
        mapControlError(err);
      }
    }),

  summary: withActiveTeam.query(async ({ ctx }) => {
    try {
      return await getControlCostSummaryForTeam(ctx.prisma, ctx.teamId);
    } catch (err) {
      mapControlError(err);
    }
  }),

  byAgent: withActiveTeam.query(async ({ ctx }) => {
    try {
      return await getControlCostByAgentForTeam(ctx.prisma, ctx.teamId);
    } catch (err) {
      mapControlError(err);
    }
  }),

  recordEvent: withActiveTeam
    .input(CreateControlCostEventInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await recordControlCostEvent(ctx.prisma, ctx.teamId, input);
      } catch (err) {
        mapControlError(err);
      }
    }),

  updateBudget: withActiveTeam
    .input(z.object({ budgetMonthlyCents: z.number().int().nonnegative() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateControlBudgetForTeam(
          ctx.prisma,
          ctx.teamId,
          input.budgetMonthlyCents
        );
      } catch (err) {
        mapControlError(err);
      }
    }),
});
