import type { RouteHandler } from "@hono/zod-openapi";
import prisma, { SyncJobStatus, SyncTrigger } from "@openplane/db";
import { type SyncJobData, syncQueue } from "@openplane/redis";
import type { AuthEnv } from "@/middleware/auth";
import { getTeamId } from "@/middleware/auth";
import type {
  getSyncHistory,
  getSyncStatus,
  pauseConnector,
  resumeConnector,
  triggerSync,
} from "./connectors.routes";

export const triggerSyncHandler: RouteHandler<
  typeof triggerSync,
  AuthEnv
> = async (c) => {
  const { id: connectorId } = c.req.valid("param");
  const { type } = c.req.valid("json");

  const connector = await prisma.connector.findUnique({
    where: { id: connectorId },
    select: { id: true, status: true, teamId: true },
  });

  if (!connector) {
    return c.json({ error: "Connector not found" }, 404);
  }

  const teamId = getTeamId(c);
  if (!teamId) {
    return c.json({ error: "team_id is required" }, 400);
  }

  if (connector.teamId !== teamId) {
    return c.json({ error: "Forbidden" }, 403);
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
      status: SyncJobStatus.RUNNING,
    },
  });

  // Create sync history record
  const syncHistory = await prisma.syncHistory.create({
    data: {
      syncJobId: syncJob.id,
      connectorId,
      status: SyncJobStatus.RUNNING,
      trigger: SyncTrigger.MANUAL,
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

  return c.json(
    {
      success: true,
      syncJobId: syncHistory.id,
      queueJobId: job.id || "",
      type: jobData.type,
      message: "Sync job queued successfully",
    },
    200
  );
};

export const getSyncHistoryHandler: RouteHandler<
  typeof getSyncHistory,
  AuthEnv
> = async (c) => {
  const { id: connectorId } = c.req.valid("param");
  const { limit = 20, offset = 0 } = c.req.valid("query");

  const connector = await prisma.connector.findUnique({
    where: { id: connectorId },
    select: { id: true, teamId: true },
  });

  if (!connector) {
    return c.json({ error: "Connector not found" }, 404);
  }

  const teamId = getTeamId(c);
  if (!teamId || connector.teamId !== teamId) {
    return c.json({ error: "Connector not found" }, 404);
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

  return c.json(
    {
      connectorId,
      history: history.map((h) => ({
        ...h,
        startedAt: h.startedAt.toISOString(),
        finishedAt: h.finishedAt?.toISOString() ?? null,
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    },
    200
  );
};

export const getSyncStatusHandler: RouteHandler<
  typeof getSyncStatus,
  AuthEnv
> = async (c) => {
  const { id: connectorId } = c.req.valid("param");

  const connector = await prisma.connector.findUnique({
    where: { id: connectorId },
    select: {
      id: true,
      status: true,
      lastSyncedAt: true,
      lastSyncStatus: true,
      lastError: true,
      lastErrorAt: true,
      teamId: true,
    },
  });

  if (!connector) {
    return c.json({ error: "Connector not found" }, 404);
  }

  const teamId = getTeamId(c);
  if (!teamId || connector.teamId !== teamId) {
    return c.json({ error: "Connector not found" }, 404);
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

  return c.json(
    {
      connector: {
        id: connector.id,
        status: connector.status,
        lastSyncedAt: connector.lastSyncedAt?.toISOString() ?? null,
        lastSyncStatus: connector.lastSyncStatus,
        lastError: connector.lastError,
        lastErrorAt: connector.lastErrorAt?.toISOString() ?? null,
      },
      latestSync: latestSync
        ? {
            ...latestSync,
            startedAt: latestSync.startedAt.toISOString(),
            finishedAt: latestSync.finishedAt?.toISOString() ?? null,
          }
        : null,
      stats: {
        totalIndexed: indexedCount,
      },
    },
    200
  );
};

export const pauseConnectorHandler: RouteHandler<
  typeof pauseConnector,
  AuthEnv
> = async (c) => {
  const { id: connectorId } = c.req.valid("param");

  const connector = await prisma.connector.findUnique({
    where: { id: connectorId },
    select: { id: true, status: true, teamId: true },
  });

  if (!connector) {
    return c.json({ error: "Connector not found" }, 404);
  }

  const teamId = getTeamId(c);
  if (!teamId || connector.teamId !== teamId) {
    return c.json({ error: "Connector not found" }, 404);
  }

  if (connector.status === "INACTIVE") {
    return c.json({ message: "Connector is already inactive" }, 200);
  }

  await prisma.connector.update({
    where: { id: connectorId },
    data: { status: "INACTIVE" },
  });

  return c.json(
    {
      success: true,
      message: "Connector set to inactive successfully",
    },
    200
  );
};

export const resumeConnectorHandler: RouteHandler<
  typeof resumeConnector,
  AuthEnv
> = async (c) => {
  const { id: connectorId } = c.req.valid("param");

  const connector = await prisma.connector.findUnique({
    where: { id: connectorId },
    select: { id: true, status: true, teamId: true },
  });

  if (!connector) {
    return c.json({ error: "Connector not found" }, 404);
  }

  const teamId = getTeamId(c);
  if (!teamId || connector.teamId !== teamId) {
    return c.json({ error: "Connector not found" }, 404);
  }

  if (connector.status === "ACTIVE") {
    return c.json({ message: "Connector is already active" }, 200);
  }

  await prisma.connector.update({
    where: { id: connectorId },
    data: { status: "ACTIVE" },
  });

  return c.json(
    {
      success: true,
      message: "Connector resumed successfully",
    },
    200
  );
};
