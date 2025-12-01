import {
  deleteConnector,
  findConnectorById,
  findConnectorByTeam,
  listConnectorResources,
  listConnectorsByTeam,
  pauseConnector as pauseConnectorDb,
  resumeConnector as resumeConnectorDb,
  updateConnectorConfig,
  updateConnectorResourceSync,
  upsertConnector,
} from "@openplane/db";
import type {
  AppType,
  SettingValue,
  UnifiedApp,
} from "@openplane/integrations";
import { appStore } from "@openplane/integrations";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter } from "../../index";
import { verifyConnectorAccess, withActiveTeam } from "./middleware";
import {
  appIdSchema,
  createConnectorSchema,
  updateSettingsSchema,
} from "./schemas";
import { cleanupRepeatableJobs, recreateRepeatableJobs } from "./utils";

export const connectorsRouter = createTRPCRouter({
  list: withActiveTeam.query(async ({ ctx }) => {
    const installedConnectors = await listConnectorsByTeam(
      ctx.prisma,
      ctx.teamId
    );

    return appStore.map((app) => {
      const connector = installedConnectors.find(
        (c) => c.app === (app.id as unknown as AppType)
      );

      const isInstalled = connector?.status === "ACTIVE";

      return {
        ...app,
        id: app.id,
        installed: isInstalled,
        connectorId: connector?.id,
        status: connector?.status,
        settings: app.settings,
        userSettings:
          (connector?.config as Record<string, SettingValue>) ?? undefined,
      };
    });
  }),

  get: withActiveTeam
    .input(z.object({ appId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const appDefinition = appStore.find((a) => a.id === input.appId);

      if (appDefinition) {
        const connector = await findConnectorByTeam(
          ctx.prisma,
          ctx.teamId,
          appDefinition.id as unknown as AppType
        );

        if (!connector) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Connector not found",
          });
        }

        return {
          ...connector,
          definition: appDefinition as UnifiedApp,
        };
      }

      const connector = await findConnectorById(ctx.prisma, input.appId, true);

      if (!connector || connector.teamId !== ctx.teamId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Connector not found or unauthorized",
        });
      }

      const connectorAppDefinition = appStore.find(
        (a) => a.id.toUpperCase() === connector.app.toUpperCase()
      );

      return {
        ...connector,
        definition: (connectorAppDefinition as UnifiedApp) ?? null,
      };
    }),

  connect: withActiveTeam
    .input(createConnectorSchema)
    .mutation(async ({ ctx, input }) =>
      upsertConnector(ctx.prisma, {
        teamId: ctx.teamId,
        userId: ctx.session.user.id,
        app: input.appId,
        workspaceExternalId: input.workspaceExternalId,
        name: input.name,
        type: input.type,
        authType: input.authType,
        // biome-ignore lint/suspicious/noExplicitAny: config type varies
        config: input.config as any,
      })
    ),

  disconnect: withActiveTeam
    .input(appIdSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyConnectorAccess(ctx.prisma, input.appId, ctx.teamId);
      await cleanupRepeatableJobs(input.appId);
      return await deleteConnector(ctx.prisma, input.appId);
    }),

  updateSettings: withActiveTeam
    .input(updateSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyConnectorAccess(ctx.prisma, input.appId, ctx.teamId);
      return await updateConnectorConfig(
        ctx.prisma,
        input.appId,
        // biome-ignore lint/suspicious/noExplicitAny: config type varies
        input.config as any
      );
    }),

  pause: withActiveTeam
    .input(z.object({ connectorId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await verifyConnectorAccess(ctx.prisma, input.connectorId, ctx.teamId);
      await cleanupRepeatableJobs(input.connectorId);
      return pauseConnectorDb(ctx.prisma, input.connectorId);
    }),

  resume: withActiveTeam
    .input(z.object({ connectorId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await verifyConnectorAccess(ctx.prisma, input.connectorId, ctx.teamId);
      const result = await resumeConnectorDb(ctx.prisma, input.connectorId);
      await recreateRepeatableJobs(ctx.prisma, input.connectorId);
      return result;
    }),

  getResources: withActiveTeam
    .input(z.object({ connectorId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      await verifyConnectorAccess(ctx.prisma, input.connectorId, ctx.teamId);
      return listConnectorResources(ctx.prisma, input.connectorId);
    }),

  toggleResourceSync: withActiveTeam
    .input(
      z.object({
        resourceId: z.string().min(1),
        syncEnabled: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get the resource to verify access
      const resource = await ctx.prisma.connectorResource.findUnique({
        where: { id: input.resourceId },
        include: { connector: { select: { teamId: true } } },
      });

      if (!resource || resource.connector.teamId !== ctx.teamId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Resource not found or unauthorized",
        });
      }

      return updateConnectorResourceSync(
        ctx.prisma,
        input.resourceId,
        input.syncEnabled
      );
    }),
});
