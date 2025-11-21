import prisma from "@openplane/db";
import { type SyncJobData, syncQueue } from "@openplane/redis";
import type { Context } from "hono";
import { Hono } from "hono";
import {
  type AuthEnv,
  getOrganizationId,
  requireAuth,
  requireScopes,
} from "../../middleware/auth";
import { API_SCOPES } from "../../types/auth";

const connectors = new Hono<AuthEnv>();
connectors.use("*", requireAuth);

/**
 * Ensure connector belongs to the authenticated organization
 */
function ensureConnectorAccess(
  c: Context<AuthEnv>,
  connectorOrgId: string
): { organizationId: string } | Response {
  const organizationId = getOrganizationId(c);

  if (!organizationId) {
    return c.json({ error: "organization_id is required" }, 400);
  }

  if (connectorOrgId !== organizationId) {
    return c.json({ error: "Forbidden" }, 403);
  }

  return { organizationId };
}

/**
 * POST /v1/connectors/:id/sync
 * Trigger a sync for a specific connector
 */
connectors.post(
  "/:id/sync",
  requireScopes([API_SCOPES.CONNECTORS_SYNC]),
  async (c) => {
    try {
      const connectorId = c.req.param("id");
      const { type = "FULL" } = await c.req.json().catch(() => ({}));

      // Validate connector exists
      const connector = await prisma.connector.findUnique({
        where: { id: connectorId },
        select: { id: true, status: true, organizationId: true },
      });

      if (!connector) {
        return c.json({ error: "Connector not found" }, 404);
      }

      const accessCheck = ensureConnectorAccess(c, connector.organizationId);
      if (accessCheck instanceof Response) {
        return accessCheck;
      }

      // Check if connector is active
      if (connector.status === "INACTIVE" || connector.status === "ERROR") {
        return c.json(
          { error: "Connector is not active. Check connector status." },
          400
        );
      }

      // Create sync job first
      const syncJob = await prisma.syncJob.create({
        data: {
          connectorId,
          type: type === "INCREMENTAL" ? "INCREMENTAL" : "FULL",
          trigger: "MANUAL",
          status: "SYNCING",
        },
      });

      // Create sync history record
      const syncHistory = await prisma.syncHistory.create({
        data: {
          syncJobId: syncJob.id,
          connectorId,
          status: "SYNCING",
          startedAt: new Date(),
        },
      });

      // Enqueue sync job to Redis
      const jobData: SyncJobData = {
        connectorId,
        syncJobId: syncHistory.id,
        type: type === "INCREMENTAL" ? "INCREMENTAL" : "FULL",
      };

      const job = await syncQueue.add("sync-connector", jobData, {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: {
          age: 3600, // Keep completed jobs for 1 hour
          count: 100,
        },
      });

      // Update connector status to syncing
      await prisma.connector.update({
        where: { id: connectorId },
        data: { status: "SYNCING" },
      });

      return c.json({
        success: true,
        syncJobId: syncHistory.id,
        queueJobId: job.id,
        type: jobData.type,
        message: "Sync job queued successfully",
      });
    } catch (error) {
      console.error("Error triggering sync:", error);
      return c.json(
        {
          error: "Failed to trigger sync",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  }
);

/**
 * GET /v1/connectors/:id/sync-history
 * Get sync history for a specific connector
 */
connectors.get(
  "/:id/sync-history",
  requireScopes([API_SCOPES.CONNECTORS_READ]),
  async (c) => {
    try {
      const connectorId = c.req.param("id");
      const limit = Number.parseInt(c.req.query("limit") || "20", 10);
      const offset = Number.parseInt(c.req.query("offset") || "0", 10);

      // Validate connector exists
      const connector = await prisma.connector.findUnique({
        where: { id: connectorId },
        select: { id: true, organizationId: true },
      });

      if (!connector) {
        return c.json({ error: "Connector not found" }, 404);
      }

      const accessCheck = ensureConnectorAccess(c, connector.organizationId);
      if (accessCheck instanceof Response) {
        return accessCheck;
      }

      // Fetch sync history
      const [history, total] = await Promise.all([
        prisma.syncHistory.findMany({
          where: { connectorId },
          orderBy: { startedAt: "desc" },
          take: limit,
          skip: offset,
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
          },
        }),
        prisma.syncHistory.count({
          where: { connectorId },
        }),
      ]);

      return c.json({
        connectorId,
        history,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      });
    } catch (error) {
      console.error("Error fetching sync history:", error);
      return c.json(
        {
          error: "Failed to fetch sync history",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  }
);

/**
 * GET /v1/connectors/:id/sync-status
 * Get current sync status for a connector
 */
connectors.get(
  "/:id/sync-status",
  requireScopes([API_SCOPES.CONNECTORS_READ]),
  async (c) => {
    try {
      const connectorId = c.req.param("id");

      // Get connector with latest sync info
      const connector = await prisma.connector.findUnique({
        where: { id: connectorId },
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
        return c.json({ error: "Connector not found" }, 404);
      }

      const accessCheck = ensureConnectorAccess(c, connector.organizationId);
      if (accessCheck instanceof Response) {
        return accessCheck;
      }

      // Get latest sync history
      const latestSync = await prisma.syncHistory.findFirst({
        where: { connectorId },
        orderBy: { startedAt: "desc" },
        select: {
          id: true,
          status: true,
          dataAdded: true,
          startedAt: true,
          finishedAt: true,
          errorMessage: true,
        },
      });

      // Get indexed document count
      const indexedCount = await prisma.indexedDocument.count({
        where: { connectorId },
      });

      return c.json({
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
          totalIndexed: indexedCount,
        },
      });
    } catch (error) {
      console.error("Error fetching sync status:", error);
      return c.json(
        {
          error: "Failed to fetch sync status",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  }
);

/**
 * POST /v1/connectors/:id/pause
 * Pause a connector (stops syncing) by setting to INACTIVE
 */
connectors.post(
  "/:id/pause",
  requireScopes([API_SCOPES.CONNECTORS_WRITE]),
  async (c) => {
    try {
      const connectorId = c.req.param("id");

      const connector = await prisma.connector.findUnique({
        where: { id: connectorId },
        select: { id: true, status: true, organizationId: true },
      });

      if (!connector) {
        return c.json({ error: "Connector not found" }, 404);
      }

      const accessCheck = ensureConnectorAccess(c, connector.organizationId);
      if (accessCheck instanceof Response) {
        return accessCheck;
      }

      if (connector.status === "INACTIVE") {
        return c.json({ message: "Connector is already inactive" });
      }

      await prisma.connector.update({
        where: { id: connectorId },
        data: { status: "INACTIVE" },
      });

      return c.json({
        success: true,
        message: "Connector set to inactive successfully",
      });
    } catch (error) {
      console.error("Error pausing connector:", error);
      return c.json(
        {
          error: "Failed to pause connector",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  }
);

/**
 * POST /v1/connectors/:id/resume
 * Resume a paused connector
 */
connectors.post(
  "/:id/resume",
  requireScopes([API_SCOPES.CONNECTORS_WRITE]),
  async (c) => {
    try {
      const connectorId = c.req.param("id");

      const connector = await prisma.connector.findUnique({
        where: { id: connectorId },
        select: { id: true, status: true, organizationId: true },
      });

      if (!connector) {
        return c.json({ error: "Connector not found" }, 404);
      }

      const accessCheck = ensureConnectorAccess(c, connector.organizationId);
      if (accessCheck instanceof Response) {
        return accessCheck;
      }

      if (connector.status === "ACTIVE") {
        return c.json({ message: "Connector is already active" });
      }

      await prisma.connector.update({
        where: { id: connectorId },
        data: { status: "ACTIVE" },
      });

      return c.json({
        success: true,
        message: "Connector resumed successfully",
      });
    } catch (error) {
      console.error("Error resuming connector:", error);
      return c.json(
        {
          error: "Failed to resume connector",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  }
);

export default connectors;
