import {
  createControlGoalForTeam,
  getControlGoalForTeam,
  listControlGoalsForTeam,
  updateControlGoalForTeam,
} from "@openbeam/services";
import { CreateControlGoalInputSchema } from "@openbeam/types/control/validators/goals";
import { z } from "zod";
import { createTRPCRouter } from "../../index";
import { withActiveTeam } from "../apps/middleware";
import { mapControlError } from "./middleware";

export const goalsRouter = createTRPCRouter({
  list: withActiveTeam
    .input(
      z.object({
        limit: z.number().int().positive().optional(),
        offset: z.number().int().nonnegative().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        return await listControlGoalsForTeam(ctx.prisma, ctx.teamId, {
          limit: input.limit,
        });
      } catch (err) {
        mapControlError(err);
      }
    }),

  get: withActiveTeam
    .input(z.object({ goalId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      try {
        return await getControlGoalForTeam(
          ctx.prisma,
          ctx.teamId,
          input.goalId
        );
      } catch (err) {
        mapControlError(err);
      }
    }),

  create: withActiveTeam
    .input(CreateControlGoalInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createControlGoalForTeam(ctx.prisma, ctx.teamId, input);
      } catch (err) {
        mapControlError(err);
      }
    }),

  update: withActiveTeam
    .input(
      z.object({
        goalId: z.string().min(1),
        data: z.record(z.string(), z.unknown()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateControlGoalForTeam(
          ctx.prisma,
          ctx.teamId,
          input.goalId,
          input.data
        );
      } catch (err) {
        mapControlError(err);
      }
    }),
});
