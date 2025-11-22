import {
  type CreateConnectorInput,
  createConnector,
  deleteConnector,
  findConnectorById,
  findConnectorByOrg,
  getSyncHistory,
  getSyncStatus,
  listConnectorsByOrg,
  pauseConnector as pauseConnectorDb,
  resumeConnector as resumeConnectorDb,
  triggerSync as triggerSyncDb,
  updateConnectorConfig,
  verifyConnectorOwnership,
} from "@openplane/db";
// @ts-expect-error - generated types might not be found in check
import type { InputJsonValue } from "@openplane/db/prisma/generated/client/runtime/library";
import {
  AppType,
  AuthType,
  appStore,
  ConnectorType,
} from "@openplane/integrations";
import { addSyncJob, type SyncJobData } from "@openplane/redis";
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

const getSyncStatusSchema = z.object({
  connectorId: z.string().min(1),
});

const getSyncHistorySchema = z.object({
  connectorId: z.string().min(1),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

const triggerSyncSchema = z.object({
  connectorId: z.string().min(1),
  type: z.enum(["FULL", "INCREMENTAL"]).default("FULL"),
});

const connectorActionSchema = z.object({
  connectorId: z.string().min(1),
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
        const connector = await findConnectorById(
          ctx.prisma,
          input.appId,
          true
        );

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

      const connector = await verifyConnectorOwnership(
        ctx.prisma,
        input.appId,
        orgId
      );

      if (!connector) {
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

      const connector = await verifyConnectorOwnership(
        ctx.prisma,
        input.appId,
        orgId
      );

      if (!connector) {
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

  // Sync Operations
  getSyncStatus: protectedProcedure
    .input(getSyncStatusSchema)
    .query(async ({ ctx, input }) => {
      const orgId = ctx.session?.session.activeOrganizationId;

      if (!orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active organization",
        });
      }

      // Verify connector ownership
      const connector = await verifyConnectorOwnership(
        ctx.prisma,
        input.connectorId,
        orgId
      );

      if (!connector) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Connector not found or unauthorized",
        });
      }

      // Get sync status
      const syncStatus = await getSyncStatus(ctx.prisma, input.connectorId);

      if (!syncStatus) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Sync status not found",
        });
      }

      return syncStatus;
    }),

  getSyncHistory: protectedProcedure
    .input(getSyncHistorySchema)
    .query(async ({ ctx, input }) => {
      const orgId = ctx.session?.session.activeOrganizationId;

      if (!orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active organization",
        });
      }

      // Verify connector ownership
      const connector = await verifyConnectorOwnership(
        ctx.prisma,
        input.connectorId,
        orgId
      );

      if (!connector) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Connector not found or unauthorized",
        });
      }

      // Get sync history
      return getSyncHistory(ctx.prisma, input.connectorId, {
        limit: input.limit,
        offset: input.offset,
      });
    }),

  triggerSync: protectedProcedure
    .input(triggerSyncSchema)
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.session?.session.activeOrganizationId;

      if (!orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active organization",
        });
      }

      // Verify connector ownership
      const connector = await verifyConnectorOwnership(
        ctx.prisma,
        input.connectorId,
        orgId
      );

      if (!connector) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Connector not found or unauthorized",
        });
      }

      // Check if connector is active
      if (connector.status === "INACTIVE" || connector.status === "ERROR") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Connector is not active. Check connector status.",
        });
      }

      // Create sync job and history
      const syncResult = await triggerSyncDb(ctx.prisma, {
        connectorId: input.connectorId,
        type: input.type,
      });

      // Enqueue sync job to Redis
      const jobData: SyncJobData = {
        connectorId: input.connectorId,
        syncJobId: syncResult.syncHistoryId,
        type: input.type,
      };

      const job = await addSyncJob(jobData, 7);

      return {
        success: true,
        syncJobId: syncResult.syncHistoryId,
        queueJobId: job.id,
        type: input.type,
        message: "Sync job queued successfully",
      };
    }),

  pauseConnector: protectedProcedure
    .input(connectorActionSchema)
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.session?.session.activeOrganizationId;

      if (!orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active organization",
        });
      }

      // Verify connector ownership
      const connector = await verifyConnectorOwnership(
        ctx.prisma,
        input.connectorId,
        orgId
      );

      if (!connector) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Connector not found or unauthorized",
        });
      }

      // Pause connector
      return pauseConnectorDb(ctx.prisma, input.connectorId);
    }),

  resumeConnector: protectedProcedure
    .input(connectorActionSchema)
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.session?.session.activeOrganizationId;

      if (!orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active organization",
        });
      }

      // Verify connector ownership
      const connector = await verifyConnectorOwnership(
        ctx.prisma,
        input.connectorId,
        orgId
      );

      if (!connector) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Connector not found or unauthorized",
        });
      }

      // Resume connector
      return resumeConnectorDb(ctx.prisma, input.connectorId);
    }),
});
