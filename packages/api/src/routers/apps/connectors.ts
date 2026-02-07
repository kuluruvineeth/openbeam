import {
  findConnectorById,
  findConnectorByTeam,
  listConnectorResources,
  listConnectorsByTeam,
  listResourceDocuments,
  type Prisma,
  pauseConnector as pauseConnectorDb,
  restoreConnector as restoreConnectorDb,
  resumeConnector as resumeConnectorDb,
  softDeleteConnector,
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
import {
  cancelConnectorCleanup,
  runConnectorCleanup,
} from "@openplane/temporal";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter } from "../../index";
import {
  verifyConnectorAccess,
  withActiveTeam,
  withAdminRole,
} from "./middleware";
import {
  appIdSchema,
  createConnectorSchema,
  updateSettingsSchema,
} from "./schemas";

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
        config: input.config,
      })
    ),

  disconnect: withAdminRole
    .input(appIdSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyConnectorAccess(ctx.prisma, input.appId, ctx.teamId);

      const connector = await softDeleteConnector(
        ctx.prisma,
        input.appId,
        ctx.session.user.id
      );

      await runConnectorCleanup({
        connectorId: input.appId,
        teamId: ctx.teamId,
      });

      return connector;
    }),

  restore: withAdminRole.input(appIdSchema).mutation(async ({ ctx, input }) => {
    const connector = await findConnectorById(ctx.prisma, input.appId);

    if (!connector || connector.teamId !== ctx.teamId) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Connector not found",
      });
    }

    if (connector.status !== "DELETING") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Connector is not scheduled for deletion",
      });
    }

    if (
      connector.scheduledDeletionAt &&
      connector.scheduledDeletionAt < new Date()
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Grace period has expired",
      });
    }

    await cancelConnectorCleanup(input.appId);

    return restoreConnectorDb(ctx.prisma, input.appId);
  }),

  updateSettings: withActiveTeam
    .input(updateSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyConnectorAccess(ctx.prisma, input.appId, ctx.teamId);
      return await updateConnectorConfig(
        ctx.prisma,
        input.appId,
        input.config as Prisma.InputJsonValue
      );
    }),

  pause: withAdminRole
    .input(z.object({ connectorId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await verifyConnectorAccess(ctx.prisma, input.connectorId, ctx.teamId);
      return pauseConnectorDb(ctx.prisma, input.connectorId);
    }),

  resume: withAdminRole
    .input(z.object({ connectorId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await verifyConnectorAccess(ctx.prisma, input.connectorId, ctx.teamId);
      return resumeConnectorDb(ctx.prisma, input.connectorId);
    }),

  getResources: withActiveTeam
    .input(
      z.object({
        connectorId: z.string().min(1),
        search: z.string().optional(),
        cursor: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      await verifyConnectorAccess(ctx.prisma, input.connectorId, ctx.teamId);
      return listConnectorResources(ctx.prisma, input.connectorId, {
        search: input.search,
        cursor: input.cursor,
        limit: input.limit,
      });
    }),

  getResourceDocuments: withActiveTeam
    .input(
      z.object({
        connectorId: z.string().min(1),
        resourceExternalId: z.string().min(1),
        search: z.string().optional(),
        cursor: z.string().optional(),
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      await verifyConnectorAccess(ctx.prisma, input.connectorId, ctx.teamId);
      return listResourceDocuments(
        ctx.prisma,
        input.connectorId,
        input.resourceExternalId,
        {
          search: input.search,
          cursor: input.cursor,
          limit: input.limit,
        }
      );
    }),

  toggleResourceSync: withActiveTeam
    .input(
      z.object({
        resourceId: z.string().min(1),
        syncEnabled: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
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
