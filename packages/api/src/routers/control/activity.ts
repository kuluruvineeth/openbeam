import { listControlActivityForTeam } from "@openbeam/services";
import { z } from "zod";
import { createTRPCRouter } from "../../index";
import { withActiveTeam } from "../apps/middleware";
import { mapControlError } from "./middleware";

export const activityRouter = createTRPCRouter({
  list: withActiveTeam
    .input(
      z.object({
        entityType: z.string().min(1).optional(),
        entityId: z.string().min(1).optional(),
        limit: z.number().int().positive().optional(),
        offset: z.number().int().nonnegative().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        return await listControlActivityForTeam(ctx.prisma, ctx.teamId, {
          entityType: input.entityType,
          entityId: input.entityId,
          limit: input.limit,
          offset: input.offset,
        });
      } catch (err) {
        mapControlError(err);
      }
    }),
});
