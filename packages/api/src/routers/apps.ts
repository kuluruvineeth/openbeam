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

      // Get connector with latest sync info
      const connector = await ctx.prisma.connector.findUnique({
        where: { id: input.connectorId },
        select: {
          id: true,
          status: true,
          lastSyncedAt: true,
          lastSyncStatus: true,
          lastError: true,
          lastErrorAt: true,
          organizationId: true,
        },
      });

      if (!connector) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Connector not found",
        });
      }

      if (connector.organizationId !== orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Unauthorized",
        });
      }

      // Get latest sync history
      const latestSync = await ctx.prisma.syncHistory.findFirst({
        where: { connectorId: input.connectorId },
        orderBy: { startedAt: "desc" },
        select: {
          id: true,
          status: true,
          dataAdded: true,
          dataUpdated: true,
          dataDeleted: true,
          startedAt: true,
          finishedAt: true,
          errorMessage: true,
          durationMs: true,
        },
      });

      // Get indexed document count
      const totalIndexed = await ctx.prisma.indexedDocument.count({
        where: { connectorId: input.connectorId },
      });

      return {
        connector: {
          id: connector.id,
          status: connector.status,
          lastSyncedAt: connector.lastSyncedAt,
          lastSyncStatus: connector.lastSyncStatus,
          lastError: connector.lastError,
          lastErrorAt: connector.lastErrorAt,
        },
        latestSync,
        stats: {
          totalIndexed,
        },
      };
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

      // Verify connector belongs to org
      const connector = await ctx.prisma.connector.findUnique({
        where: { id: input.connectorId },
        select: { id: true, organizationId: true },
      });

      if (!connector) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Connector not found",
        });
      }

      if (connector.organizationId !== orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Unauthorized",
        });
      }

      // Fetch sync history with pagination
      const [history, total] = await Promise.all([
        ctx.prisma.syncHistory.findMany({
          where: { connectorId: input.connectorId },
          orderBy: { startedAt: "desc" },
          take: input.limit,
          skip: input.offset,
          select: {
            id: true,
            status: true,
            dataAdded: true,
            dataUpdated: true,
            dataDeleted: true,
            errorMessage: true,
            summary: true,
            startedAt: true,
            finishedAt: true,
            durationMs: true,
            syncJob: {
              select: {
                type: true,
                trigger: true,
              },
            },
          },
        }),
        ctx.prisma.syncHistory.count({
          where: { connectorId: input.connectorId },
        }),
      ]);

      return {
        connectorId: input.connectorId,
        history,
        pagination: {
          total,
          limit: input.limit,
          offset: input.offset,
          hasMore: input.offset + input.limit < total,
        },
      };
    }),

  triggerSync: protectedProcedure
    .input(triggerSyncSchema)
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.session?.session.activeOrganizationId;
      const userId = ctx.session?.user.id;

      if (!(orgId && userId)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active organization or user",
        });
      }

      // Validate connector exists and is active
      const connector = await ctx.prisma.connector.findUnique({
        where: { id: input.connectorId },
        select: { id: true, status: true, organizationId: true },
      });

      if (!connector) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Connector not found",
        });
      }

      if (connector.organizationId !== orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Unauthorized",
        });
      }

      // Check if connector is active
      if (connector.status === "INACTIVE" || connector.status === "ERROR") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Connector is not active. Check connector status.",
        });
      }

      // Create sync job
      const syncJob = await ctx.prisma.syncJob.create({
        data: {
          connectorId: input.connectorId,
          type: input.type,
          trigger: "MANUAL",
          status: "SYNCING",
        },
      });

      // Create sync history record
      const syncHistory = await ctx.prisma.syncHistory.create({
        data: {
          syncJobId: syncJob.id,
          connectorId: input.connectorId,
          status: "SYNCING",
          startedAt: new Date(),
        },
      });

      // Enqueue sync job to Redis
      const jobData: SyncJobData = {
        connectorId: input.connectorId,
        syncJobId: syncHistory.id,
        type: input.type,
      };

      const job = await addSyncJob(jobData, 7);

      // Update connector status to syncing
      await ctx.prisma.connector.update({
        where: { id: input.connectorId },
        data: { status: "SYNCING" },
      });

      return {
        success: true,
        syncJobId: syncHistory.id,
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

      const connector = await ctx.prisma.connector.findUnique({
        where: { id: input.connectorId },
        select: { id: true, status: true, organizationId: true },
      });

      if (!connector) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Connector not found",
        });
      }

      if (connector.organizationId !== orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Unauthorized",
        });
      }

      if (connector.status === "INACTIVE") {
        return {
          success: true,
          message: "Connector is already inactive",
        };
      }

      await ctx.prisma.connector.update({
        where: { id: input.connectorId },
        data: { status: "INACTIVE" },
      });

      return {
        success: true,
        message: "Connector paused successfully",
      };
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

      const connector = await ctx.prisma.connector.findUnique({
        where: { id: input.connectorId },
        select: { id: true, status: true, organizationId: true },
      });

      if (!connector) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Connector not found",
        });
      }

      if (connector.organizationId !== orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Unauthorized",
        });
      }

      if (connector.status === "ACTIVE") {
        return {
          success: true,
          message: "Connector is already active",
        };
      }

      await ctx.prisma.connector.update({
        where: { id: input.connectorId },
        data: { status: "ACTIVE" },
      });

      return {
        success: true,
        message: "Connector resumed successfully",
      };
    }),
});
