import type { RouteHandler } from "@hono/zod-openapi";
import prisma from "@openbeam/db";
import {
  ConnectorServiceError,
  createManualConnectorSyncForTeam,
  getConnectorSyncHistoryForTeam,
  getConnectorSyncStatusForTeam,
  pauseConnectorForTeam,
  resumeConnectorForTeam,
} from "@openbeam/services/connectors";
import { startConnectorSync } from "@openbeam/temporal";
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
  const syncType = type === "INCREMENTAL" ? "INCREMENTAL" : "FULL";

  try {
    const teamId = getTeamId(c);
    const syncRequest = await createManualConnectorSyncForTeam(prisma, {
      connectorId,
      teamId,
      type: syncType,
    });

    const syncHandle = await startConnectorSync({
      connectorId,
      connectorType: syncRequest.connectorType,
      syncType: syncRequest.syncType,
      trigger: "MANUAL",
      requestId: syncRequest.syncHistoryId,
      teamId: teamId ?? "",
    });

    return c.json(
      {
        success: true,
        syncJobId: syncRequest.syncHistoryId,
        workflowId: syncHandle.workflowId,
        type: syncRequest.syncType,
        message: "Sync workflow started successfully",
      },
      200
    );
  } catch (error) {
    if (error instanceof ConnectorServiceError) {
      if (error.code === "NOT_FOUND") {
        return c.json({ error: error.message }, 404);
      }
      return c.json({ error: error.message }, 400);
    }
    throw error;
  }
};

// @ts-expect-error TS2589: RouteHandler instantiation is excessively deep on this generated route schema.
export const getSyncHistoryHandler: RouteHandler<
  typeof getSyncHistory,
  AuthEnv
> = async (c) => {
  const { id: connectorId } = c.req.valid("param");
  const { limit = 20, offset = 0 } = c.req.valid("query");
  try {
    const historyPage = await getConnectorSyncHistoryForTeam(prisma, {
      connectorId,
      teamId: getTeamId(c),
      limit,
      offset,
    });

    return c.json(
      {
        connectorId,
        history: historyPage.history.map((h) => ({
          ...h,
          startedAt: h.startedAt.toISOString(),
          finishedAt: h.finishedAt?.toISOString() ?? null,
        })),
        pagination: historyPage.pagination,
      },
      200
    );
  } catch (error) {
    if (error instanceof ConnectorServiceError) {
      if (error.code === "NOT_FOUND") {
        return c.json({ error: error.message }, 404);
      }
      return c.json({ error: error.message }, 400);
    }
    throw error;
  }
};

export const getSyncStatusHandler: RouteHandler<
  typeof getSyncStatus,
  AuthEnv
> = async (c) => {
  const { id: connectorId } = c.req.valid("param");
  try {
    const syncStatus = await getConnectorSyncStatusForTeam(prisma, {
      connectorId,
      teamId: getTeamId(c),
    });

    return c.json(
      {
        connector: {
          id: syncStatus.connector.id,
          status: syncStatus.connector.status,
          lastSyncedAt:
            syncStatus.connector.lastSyncedAt?.toISOString() ?? null,
          lastSyncStatus: syncStatus.connector.lastSyncStatus,
          lastError: syncStatus.connector.lastError,
          lastErrorAt: syncStatus.connector.lastErrorAt?.toISOString() ?? null,
        },
        latestSync: syncStatus.latestSync
          ? {
              ...syncStatus.latestSync,
              startedAt: syncStatus.latestSync.startedAt.toISOString(),
              finishedAt:
                syncStatus.latestSync.finishedAt?.toISOString() ?? null,
            }
          : null,
        stats: {
          totalIndexed: syncStatus.stats.totalIndexed,
        },
      },
      200
    );
  } catch (error) {
    if (error instanceof ConnectorServiceError) {
      if (error.code === "NOT_FOUND") {
        return c.json({ error: error.message }, 404);
      }
      return c.json({ error: error.message }, 400);
    }
    throw error;
  }
};

export const pauseConnectorHandler: RouteHandler<
  typeof pauseConnector,
  AuthEnv
> = async (c) => {
  const { id: connectorId } = c.req.valid("param");
  try {
    const result = await pauseConnectorForTeam(prisma, {
      connectorId,
      teamId: getTeamId(c),
    });
    return c.json(
      {
        success: result.success,
        message: result.message,
      },
      200
    );
  } catch (error) {
    if (error instanceof ConnectorServiceError) {
      if (error.code === "NOT_FOUND") {
        return c.json({ error: error.message }, 404);
      }
      return c.json({ error: error.message }, 400);
    }
    throw error;
  }
};

export const resumeConnectorHandler: RouteHandler<
  typeof resumeConnector,
  AuthEnv
> = async (c) => {
  const { id: connectorId } = c.req.valid("param");
  try {
    const result = await resumeConnectorForTeam(prisma, {
      connectorId,
      teamId: getTeamId(c),
    });
    return c.json(
      {
        success: result.success,
        message: result.message,
      },
      200
    );
  } catch (error) {
    if (error instanceof ConnectorServiceError) {
      if (error.code === "NOT_FOUND") {
        return c.json({ error: error.message }, 404);
      }
      return c.json({ error: error.message }, 400);
    }
    throw error;
  }
};
