import {
  createConnector,
  deleteConnector,
  updateConnectorConfig,
} from "@openplane/db/mutations/connectors";
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

// Schemas for validation
const createConnectorSchema = z.object({
  appId: createZodEnum(AppType),
  workspaceExternalId: z.string(),
  name: z.string(),
  type: createZodEnum(ConnectorType),
  authType: createZodEnum(AuthType),
  config: z.record(z.string(), z.unknown()).optional(),
});

const updateSettingsSchema = z.object({
  appId: z.string(), // Connector ID
  config: z.record(z.string(), z.unknown()),
});

const disconnectSchema = z.object({
  appId: z.string(), // Connector ID
});

export const appsRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const availableApps = appStore;
    const orgId = ctx.session?.session.activeOrganizationId;

    if (!orgId) {
      return availableApps.map((app) => ({ ...app, installed: false }));
    }

    const installedConnectors = await ctx.prisma.connector.findMany({
      where: { organizationId: orgId },
      select: { id: true, app: true, config: true },
    });

    return availableApps.map((app) => {
      const connector = installedConnectors.find(
        (c) => c.app === (app.id as unknown as AppType)
      );

      return {
        ...app,
        id: app.id,
        installed: !!connector,
        connectorId: connector?.id,
        settings: app.settings,
        userSettings:
          (connector?.config as Record<string, unknown>) || undefined,
      };
    });
  }),

  get: protectedProcedure
    .input(z.object({ appId: z.string() }))
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
            message: "App not found",
          });
        }
        return { ...connector };
      }

      const connector = await ctx.prisma.connector.findFirst({
        where: {
          organizationId: orgId,
          app: appDefinition.id as unknown as AppType,
        },
        include: { oauthProvider: true },
      });

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

      // Check if already connected?
      // For now, allow multiple or check uniqueness.
      // The DB schema has a unique constraint on [orgId, workspaceExternalId, app, name].

      const connector = await createConnector(ctx.prisma, {
        organizationId: orgId,
        userId: ctx.session.user.id,
        app: input.appId,
        workspaceExternalId: input.workspaceExternalId,
        name: input.name,
        type: input.type,
        authType: input.authType,
        config: input.config as InputJsonValue | undefined,
      });

      // TODO: When OAuth flow is implemented, if authType === AuthType.OAUTH2 and OAuth tokens
      // are available (from OAuth callback), call upsertOAuthProvider from @openplane/db/mutations/oauth
      // to store accessToken, refreshToken, expiresAt, scopes, etc.

      return connector;
    }),

  disconnect: protectedProcedure
    .input(disconnectSchema)
    .mutation(async ({ ctx, input }) => {
      const connector = await ctx.prisma.connector.findUnique({
        where: { id: input.appId },
        select: { organizationId: true },
      });

      if (
        !connector ||
        connector.organizationId !== ctx.session?.session.activeOrganizationId
      ) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Connector not found or unauthorized",
        });
      }

      // TODO: When OAuth flow is implemented, if connector has OAuth provider, consider revoking
      // OAuth tokens with the provider (e.g., Slack token revocation) before deletion.
      // The OAuth provider will be automatically deleted via cascade, but revoking tokens is a best practice.

      return await deleteConnector(ctx.prisma, input.appId);
    }),

  updateSettings: protectedProcedure
    .input(updateSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      const connector = await ctx.prisma.connector.findUnique({
        where: { id: input.appId },
        select: { organizationId: true },
      });

      if (
        !connector ||
        connector.organizationId !== ctx.session?.session.activeOrganizationId
      ) {
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
