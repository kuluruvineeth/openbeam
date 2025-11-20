import {
  type CreateConnectorInput,
  createConnector,
  deleteConnector,
  findConnectorByOrg,
  listConnectorsByOrg,
  updateConnectorConfig,
} from "@openplane/db";
// @ts-expect-error - generated types might not be found in check
import type { InputJsonValue } from "@openplane/db/prisma/generated/client/runtime/library";
import {
  AppType,
  AuthType,
  appStore,
  ConnectorType,
} from "@openplane/integrations";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../index";
import { createZodEnum } from "../utils/zod";

const createConnectorSchema = z.object({
  appId: createZodEnum(AppType),
  workspaceExternalId: z.string().min(1),
  name: z.string().min(1),
  type: createZodEnum(ConnectorType),
  authType: createZodEnum(AuthType),
  config: z.record(z.string(), z.unknown()).optional(),
});

const updateSettingsSchema = z.object({
  appId: z.string().min(1),
  config: z.record(z.string(), z.unknown()),
});

const disconnectSchema = z.object({
  appId: z.string().min(1),
});

export const appsRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const orgId = ctx.session?.session.activeOrganizationId;

    if (!orgId) {
      return appStore.map((app) => ({ ...app, installed: false }));
    }

    const installedConnectors = await listConnectorsByOrg(ctx.prisma, orgId);

    return appStore.map((app) => {
      const connector = installedConnectors.find(
        (c) => c.app === (app.id as unknown as AppType)
      );

      // Only show as "installed" if connector is ACTIVE
      // CONNECTING status means OAuth is pending
      const isInstalled = connector?.status === "ACTIVE";

      return {
        ...app,
        id: app.id,
        installed: isInstalled,
        connectorId: connector?.id,
        status: connector?.status,
        settings: app.settings,
        userSettings:
          (connector?.config as Record<string, unknown>) ?? undefined,
      };
    });
  }),

  get: protectedProcedure
    .input(z.object({ appId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const orgId = ctx.session?.session.activeOrganizationId;

      if (!orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active organization",
        });
      }

      const appDefinition = appStore.find((a) => a.id === input.appId);

      if (!appDefinition) {
        const connector = await ctx.prisma.connector.findUnique({
          where: { id: input.appId },
          include: { oauthProvider: true },
        });

        if (!connector || connector.organizationId !== orgId) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Connector not found or unauthorized",
          });
        }

        return { ...connector };
      }

      const connector = await findConnectorByOrg(
        ctx.prisma,
        orgId,
        appDefinition.id as unknown as AppType
      );

      return {
        definition: appDefinition,
        connector,
      };
    }),

  connect: protectedProcedure
    .input(createConnectorSchema)
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.session?.session.activeOrganizationId;

      if (!orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active organization",
        });
      }

      const connectorInput: CreateConnectorInput = {
        organizationId: orgId,
        userId: ctx.session.user.id,
        app: input.appId,
        workspaceExternalId: input.workspaceExternalId,
        name: input.name,
        type: input.type,
        authType: input.authType,
        config: input.config as InputJsonValue | undefined,
      };

      return await createConnector(ctx.prisma, connectorInput);
    }),

  disconnect: protectedProcedure
    .input(disconnectSchema)
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.session?.session.activeOrganizationId;

      if (!orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active organization",
        });
      }

      const connector = await ctx.prisma.connector.findUnique({
        where: { id: input.appId },
        select: { organizationId: true },
      });

      if (!connector || connector.organizationId !== orgId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Connector not found or unauthorized",
        });
      }

      return await deleteConnector(ctx.prisma, input.appId);
    }),

  updateSettings: protectedProcedure
    .input(updateSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.session?.session.activeOrganizationId;

      if (!orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active organization",
        });
      }

      const connector = await ctx.prisma.connector.findUnique({
        where: { id: input.appId },
        select: { organizationId: true },
      });

      if (!connector || connector.organizationId !== orgId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Connector not found or unauthorized",
        });
      }

      return await updateConnectorConfig(
        ctx.prisma,
        input.appId,
        input.config as InputJsonValue
      );
    }),
});
