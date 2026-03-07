import {
  activateControlAgentForTeam,
  countControlAgentsForTeam,
  createControlAgentApiKeyForTeam,
  createControlAgentForTeam,
  enqueueWakeup,
  getControlAgentChainOfCommand,
  getControlAgentForTeam,
  getControlAgentOrgChartForTeam,
  getControlAgentWithRelationsForTeam,
  listControlAgentApiKeysForTeam,
  listControlAgentConfigRevisionsForTeam,
  listControlAgentsForTeam,
  pauseControlAgentForTeam,
  removeControlAgentForTeam,
  resumeControlAgentForTeam,
  revokeAllControlAgentApiKeysForTeam,
  revokeControlAgentApiKeyForTeam,
  rollbackControlAgentConfigForTeam,
  terminateControlAgentForTeam,
  updateControlAgentForTeam,
} from "@openbeam/services";
import {
  CreateControlAgentInputSchema,
  WakeControlAgentInputSchema,
} from "@openbeam/types/control/validators/agents";
import { z } from "zod";
import { createTRPCRouter } from "../../index";
import { withActiveTeam } from "../apps/middleware";
import { mapControlError } from "./middleware";

export const agentsRouter = createTRPCRouter({
  list: withActiveTeam
    .input(
      z.object({
        status: z.string().optional(),
        limit: z.number().int().positive().optional(),
        offset: z.number().int().nonnegative().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        return await listControlAgentsForTeam(ctx.prisma, ctx.teamId, {
          status: input.status,
          limit: input.limit,
          offset: input.offset,
        });
      } catch (err) {
        mapControlError(err);
      }
    }),

  get: withActiveTeam
    .input(z.object({ agentId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      try {
        return await getControlAgentForTeam(
          ctx.prisma,
          ctx.teamId,
          input.agentId
        );
      } catch (err) {
        mapControlError(err);
      }
    }),

  getWithRelations: withActiveTeam
    .input(z.object({ agentId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      try {
        return await getControlAgentWithRelationsForTeam(
          ctx.prisma,
          ctx.teamId,
          input.agentId
        );
      } catch (err) {
        mapControlError(err);
      }
    }),

  create: withActiveTeam
    .input(CreateControlAgentInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createControlAgentForTeam(ctx.prisma, ctx.teamId, input);
      } catch (err) {
        mapControlError(err);
      }
    }),

  update: withActiveTeam
    .input(
      z.object({
        agentId: z.string().min(1),
        data: z.record(z.string(), z.unknown()),
        recordRevision: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateControlAgentForTeam(ctx.prisma, {
          teamId: ctx.teamId,
          agentId: input.agentId,
          data: input.data,
          options: {
            recordRevision: input.recordRevision,
            actorUserId: ctx.session.user.id,
          },
        });
      } catch (err) {
        mapControlError(err);
      }
    }),

  pause: withActiveTeam
    .input(z.object({ agentId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await pauseControlAgentForTeam(
          ctx.prisma,
          ctx.teamId,
          input.agentId
        );
      } catch (err) {
        mapControlError(err);
      }
    }),

  resume: withActiveTeam
    .input(z.object({ agentId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await resumeControlAgentForTeam(
          ctx.prisma,
          ctx.teamId,
          input.agentId
        );
      } catch (err) {
        mapControlError(err);
      }
    }),

  terminate: withActiveTeam
    .input(z.object({ agentId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await terminateControlAgentForTeam(
          ctx.prisma,
          ctx.teamId,
          input.agentId
        );
      } catch (err) {
        mapControlError(err);
      }
    }),

  remove: withActiveTeam
    .input(z.object({ agentId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await removeControlAgentForTeam(
          ctx.prisma,
          ctx.teamId,
          input.agentId
        );
      } catch (err) {
        mapControlError(err);
      }
    }),

  activate: withActiveTeam
    .input(z.object({ agentId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await activateControlAgentForTeam(
          ctx.prisma,
          ctx.teamId,
          input.agentId
        );
      } catch (err) {
        mapControlError(err);
      }
    }),

  createApiKey: withActiveTeam
    .input(z.object({ agentId: z.string().min(1), name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await createControlAgentApiKeyForTeam(ctx.prisma, {
          teamId: ctx.teamId,
          agentId: input.agentId,
          name: input.name,
        });
      } catch (err) {
        mapControlError(err);
      }
    }),

  listApiKeys: withActiveTeam
    .input(z.object({ agentId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      try {
        return await listControlAgentApiKeysForTeam(
          ctx.prisma,
          ctx.teamId,
          input.agentId
        );
      } catch (err) {
        mapControlError(err);
      }
    }),

  revokeApiKey: withActiveTeam
    .input(z.object({ keyId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await revokeControlAgentApiKeyForTeam(
          ctx.prisma,
          input.keyId,
          ctx.teamId
        );
      } catch (err) {
        mapControlError(err);
      }
    }),

  revokeAllApiKeys: withActiveTeam
    .input(z.object({ agentId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await revokeAllControlAgentApiKeysForTeam(
          ctx.prisma,
          ctx.teamId,
          input.agentId
        );
      } catch (err) {
        mapControlError(err);
      }
    }),

  listConfigRevisions: withActiveTeam
    .input(z.object({ agentId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      try {
        return await listControlAgentConfigRevisionsForTeam(
          ctx.prisma,
          ctx.teamId,
          input.agentId
        );
      } catch (err) {
        mapControlError(err);
      }
    }),

  rollbackConfig: withActiveTeam
    .input(
      z.object({
        agentId: z.string().min(1),
        revisionId: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await rollbackControlAgentConfigForTeam(ctx.prisma, {
          teamId: ctx.teamId,
          agentId: input.agentId,
          revisionId: input.revisionId,
          actorUserId: ctx.session.user.id,
        });
      } catch (err) {
        mapControlError(err);
      }
    }),

  chainOfCommand: withActiveTeam
    .input(z.object({ agentId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      try {
        return await getControlAgentChainOfCommand(
          ctx.prisma,
          ctx.teamId,
          input.agentId
        );
      } catch (err) {
        mapControlError(err);
      }
    }),

  orgChart: withActiveTeam.query(async ({ ctx }) => {
    try {
      return await getControlAgentOrgChartForTeam(ctx.prisma, ctx.teamId);
    } catch (err) {
      mapControlError(err);
    }
  }),

  wake: withActiveTeam
    .input(WakeControlAgentInputSchema.extend({ agentId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await enqueueWakeup(ctx.prisma, ctx.teamId, input.agentId, {
          source: input.source as
            | "TIMER"
            | "ASSIGNMENT"
            | "ON_DEMAND"
            | "AUTOMATION",
          triggerDetail: input.triggerDetail,
          reason: input.reason ?? undefined,
          payload: input.payload ?? undefined,
          idempotencyKey: input.idempotencyKey ?? undefined,
        });
      } catch (err) {
        mapControlError(err);
      }
    }),

  count: withActiveTeam
    .input(z.object({ status: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      try {
        return await countControlAgentsForTeam(
          ctx.prisma,
          ctx.teamId,
          input.status
        );
      } catch (err) {
        mapControlError(err);
      }
    }),
});
