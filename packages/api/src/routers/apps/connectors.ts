/**
 * Connectors Router
 * Full connector management with health, stats, and webhook support
 */

import { randomBytes } from "node:crypto";
import { appStore } from "@openplane/connectors";
import type { AppType, CreateConnectorInput, Prisma } from "@openplane/db";
import {
  countConnectorsByStatus,
  createConnector,
  deleteConnector,
  disableConnectorWebhook,
  enableConnectorWebhook,
  findConnectorById,
  findConnectorByTeam,
  getConnectorHealth,
  getConnectorsWithErrors,
  getConnectorWebhook,
  getConnectorWithDetails,
  listConnectorsByTeam,
  pauseConnector as pauseConnectorDb,
  resumeConnector as resumeConnectorDb,
  updateConnector,
  updateConnectorConfig,
  updateConnectorWebhook,
} from "@openplane/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter } from "../../index";
import { verifyConnectorAccess, withActiveTeam, withAdmin } from "./middleware";
import {
  appIdSchema,
  createConnectorSchema,
  updateSettingsSchema,
} from "./schemas";
import { cleanupRepeatableJobs, recreateRepeatableJobs } from "./utils";

// ============================================================================
// Router
// ============================================================================

export const connectorsRouter = createTRPCRouter({
  /**
   * List all connectors with app store info
   */
  list: withActiveTeam.query(async ({ ctx }) => {
    const installedConnectors = await listConnectorsByTeam(
      ctx.prisma,
      ctx.teamId
    );

    return appStore.map((app) => {
      const connector = installedConnectors.find(
        (c) => c.app === (app.id as unknown as AppType)
      );

      return {
        ...app,
        id: app.id,
        installed: connector?.status === "ACTIVE",
        connectorId: connector?.id,
        status: connector?.status,
        settings: app.settings,
        userSettings:
          (connector?.config as Record<string, unknown>) ?? undefined,
      };
    });
  }),

  /**
   * Get connector by ID or app ID
   */
  get: withActiveTeam
    .input(z.object({ appId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const appDefinition = appStore.find((a) => a.id === input.appId);

      if (!appDefinition) {
        const connector = await findConnectorById(
          ctx.prisma,
          input.appId,
          true
        );

        if (!connector || connector.teamId !== ctx.teamId) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Connector not found or unauthorized",
          });
        }

        return { ...connector };
      }

      const connector = await findConnectorByTeam(
        ctx.prisma,
        ctx.teamId,
        appDefinition.id as unknown as AppType
      );

      return { definition: appDefinition, connector };
    }),

  /**
   * Get connector with full details (stats, health)
   */
  getDetails: withActiveTeam
    .input(z.object({ connectorId: z.string() }))
    .query(async ({ ctx, input }) => {
      const connector = await getConnectorWithDetails(
        ctx.prisma,
        input.connectorId,
        ctx.teamId
      );

      if (!connector) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Connector not found",
        });
      }

      return connector;
    }),

  /**
   * Connect (create) a connector
   */
  connect: withActiveTeam
    .input(createConnectorSchema)
    .mutation(async ({ ctx, input }) => {
      const connectorInput: CreateConnectorInput = {
        teamId: ctx.teamId,
        userId: ctx.session.user.id,
        app: input.appId as unknown as AppType,
        workspaceExternalId: input.workspaceExternalId,
        name: input.name,
        type: input.type,
        authType: input.authType,
        config: input.config as Prisma.InputJsonValue | undefined,
      };
      return createConnector(ctx.prisma, connectorInput);
    }),

  /**
   * Disconnect (delete) a connector
   */
  disconnect: withActiveTeam
    .input(appIdSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyConnectorAccess(ctx.prisma, input.appId, ctx.teamId);
      await cleanupRepeatableJobs(input.appId);
      return deleteConnector(ctx.prisma, input.appId);
    }),

  /**
   * Update connector settings
   */
  updateSettings: withActiveTeam
    .input(updateSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyConnectorAccess(ctx.prisma, input.appId, ctx.teamId);
      return updateConnectorConfig(
        ctx.prisma,
        input.appId,
        input.config as Prisma.InputJsonValue
      );
    }),

  /**
   * Pause connector
   */
  pause: withActiveTeam
    .input(z.object({ connectorId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await verifyConnectorAccess(ctx.prisma, input.connectorId, ctx.teamId);
      await cleanupRepeatableJobs(input.connectorId);
      return pauseConnectorDb(ctx.prisma, input.connectorId);
    }),

  /**
   * Resume connector
   */
  resume: withActiveTeam
    .input(z.object({ connectorId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await verifyConnectorAccess(ctx.prisma, input.connectorId, ctx.teamId);
      const result = await resumeConnectorDb(ctx.prisma, input.connectorId);
      await recreateRepeatableJobs(ctx.prisma, input.connectorId);
      return result;
    }),

  // ==========================================================================
  // Health & Status
  // ==========================================================================

  /**
   * Get connector health info
   */
  getHealth: withActiveTeam
    .input(z.object({ connectorId: z.string() }))
    .query(async ({ ctx, input }) => {
      await verifyConnectorAccess(ctx.prisma, input.connectorId, ctx.teamId);
      const health = await getConnectorHealth(ctx.prisma, input.connectorId);

      if (!health) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Connector not found",
        });
      }

      return health;
    }),

  /**
   * Get connectors with errors
   */
  getWithErrors: withActiveTeam.query(async ({ ctx }) =>
    getConnectorsWithErrors(ctx.prisma, ctx.teamId)
  ),

  /**
   * Get connector status counts
   */
  getStatusCounts: withActiveTeam.query(async ({ ctx }) =>
    countConnectorsByStatus(ctx.prisma, ctx.teamId)
  ),

  /**
   * Update connector status (Admin only)
   */
  updateStatus: withAdmin
    .input(
      z.object({
        connectorId: z.string(),
        status: z.enum([
          "ACTIVE",
          "INACTIVE",
          "ERROR",
          "SYNCING",
          "CONNECTING",
          "PAUSED",
          "RATE_LIMITED",
          "AUTH_EXPIRED",
        ]),
        statusMessage: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await verifyConnectorAccess(ctx.prisma, input.connectorId, ctx.teamId);
      return updateConnector(ctx.prisma, input.connectorId, {
        status: input.status,
        statusMessage: input.statusMessage,
        statusChangedAt: new Date(),
      });
    }),

  /**
   * Clear connector errors
   */
  clearErrors: withActiveTeam
    .input(z.object({ connectorId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await verifyConnectorAccess(ctx.prisma, input.connectorId, ctx.teamId);
      return updateConnector(ctx.prisma, input.connectorId, {
        consecutiveErrors: 0,
        lastError: null,
        lastErrorAt: null,
        lastErrorCode: null,
        errorBackoffUntil: null,
        status: "ACTIVE",
        statusMessage: null,
        statusChangedAt: new Date(),
      });
    }),

  // ==========================================================================
  // Webhooks
  // ==========================================================================

  /**
   * Get webhook configuration
   */
  getWebhook: withActiveTeam
    .input(z.object({ connectorId: z.string() }))
    .query(async ({ ctx, input }) => {
      await verifyConnectorAccess(ctx.prisma, input.connectorId, ctx.teamId);
      return getConnectorWebhook(ctx.prisma, input.connectorId);
    }),

  /**
   * Enable webhook for connector
   */
  enableWebhook: withAdmin
    .input(
      z.object({
        connectorId: z.string(),
        config: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await verifyConnectorAccess(ctx.prisma, input.connectorId, ctx.teamId);
      const secret = randomBytes(32).toString("hex");
      return enableConnectorWebhook(
        ctx.prisma,
        input.connectorId,
        secret,
        input.config as Prisma.InputJsonValue | undefined
      );
    }),

  /**
   * Disable webhook for connector
   */
  disableWebhook: withAdmin
    .input(z.object({ connectorId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await verifyConnectorAccess(ctx.prisma, input.connectorId, ctx.teamId);
      return disableConnectorWebhook(ctx.prisma, input.connectorId);
    }),

  /**
   * Update webhook configuration
   */
  updateWebhook: withAdmin
    .input(
      z.object({
        connectorId: z.string(),
        webhookEnabled: z.boolean().optional(),
        webhookConfig: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await verifyConnectorAccess(ctx.prisma, input.connectorId, ctx.teamId);
      return updateConnectorWebhook(ctx.prisma, input.connectorId, {
        webhookEnabled: input.webhookEnabled,
        webhookConfig: input.webhookConfig as Prisma.InputJsonValue | undefined,
      });
    }),
});
