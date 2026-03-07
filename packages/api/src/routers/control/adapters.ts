import {
  getAdapterConfigurationDoc,
  getAdapterOrThrow,
  listAdapterTypes,
  resolveEnvBindings,
} from "@openbeam/services";
import { TestAdapterEnvironmentInputSchema } from "@openbeam/types/control/validators/agents";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter } from "../../index";
import { withActiveTeam } from "../apps/middleware";
import { mapControlError } from "./middleware";

export const adaptersRouter = createTRPCRouter({
  listTypes: withActiveTeam.query(() => listAdapterTypes()),

  getConfigDoc: withActiveTeam
    .input(z.object({ type: z.string().min(1) }))
    .query(({ input }) => getAdapterConfigurationDoc(input.type)),

  testEnvironment: withActiveTeam
    .input(
      z.object({
        type: z.string().min(1),
        adapterConfig: TestAdapterEnvironmentInputSchema.shape.adapterConfig,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const adapter = getAdapterOrThrow(input.type);

      if (!adapter.testEnvironment) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Adapter "${input.type}" does not support environment testing`,
        });
      }

      try {
        const env = await resolveEnvBindings(
          ctx.prisma,
          ctx.teamId,
          (input.adapterConfig.env as Record<string, unknown>) ?? {}
        );

        return await adapter.testEnvironment({
          config: input.adapterConfig,
          env,
        });
      } catch (err) {
        mapControlError(err);
      }
    }),
});
