import {
  createControlSecretForTeam,
  listControlSecretsForTeam,
  rotateControlSecretForTeam,
} from "@openbeam/services";
import { CreateControlSecretInputSchema } from "@openbeam/types/control/validators/secrets";
import { z } from "zod";
import { createTRPCRouter } from "../../index";
import { withActiveTeam } from "../apps/middleware";
import { mapControlError } from "./middleware";

export const secretsRouter = createTRPCRouter({
  list: withActiveTeam.query(async ({ ctx }) => {
    try {
      return await listControlSecretsForTeam(ctx.prisma, ctx.teamId);
    } catch (err) {
      mapControlError(err);
    }
  }),

  create: withActiveTeam
    .input(CreateControlSecretInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createControlSecretForTeam(ctx.prisma, ctx.teamId, input, {
          userId: ctx.session.user.id,
        });
      } catch (err) {
        mapControlError(err);
      }
    }),

  rotate: withActiveTeam
    .input(
      z.object({
        secretId: z.string().min(1),
        value: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await rotateControlSecretForTeam(ctx.prisma, {
          teamId: ctx.teamId,
          secretId: input.secretId,
          value: input.value,
          actor: { userId: ctx.session.user.id },
        });
      } catch (err) {
        mapControlError(err);
      }
    }),
});
