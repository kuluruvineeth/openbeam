import { createRoute } from "@hono/zod-openapi";
import {
  connectorIdParamsSchema,
  errorSchema,
  getSyncHistoryQuerySchema,
  getSyncHistoryResponseSchema,
  getSyncStatusResponseSchema,
  pauseResumeResponseSchema,
  triggerSyncBodySchema,
  triggerSyncResponseSchema,
} from "./connectors.schema";

const tags = ["Connectors"];

export const triggerSync = createRoute({
  tags,
  method: "post",
  path: "/{id}/sync",
  summary: "Trigger a sync",
  description: "Manually trigger a full or incremental sync for a connector",
  request: {
    params: connectorIdParamsSchema,
    body: {
      content: {
        "application/json": {
          schema: triggerSyncBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: triggerSyncResponseSchema,
        },
      },
      description: "Sync triggered successfully",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "Connector not found",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Bad Request",
    },
    403: {
      content: { "application/json": { schema: errorSchema } },
      description: "Forbidden",
    },
  },
});

export const getSyncHistory = createRoute({
  tags,
  method: "get",
  path: "/{id}/sync-history",
  summary: "Get sync history",
  description: "Retrieve sync history for a connector",
  request: {
    params: connectorIdParamsSchema,
    query: getSyncHistoryQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: getSyncHistoryResponseSchema,
        },
      },
      description: "Sync history retrieved successfully",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "Connector not found",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Bad Request",
    },
  },
});

export const getSyncStatus = createRoute({
  tags,
  method: "get",
  path: "/{id}/sync-status",
  summary: "Get sync status",
  description: "Retrieve current sync status for a connector",
  request: {
    params: connectorIdParamsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: getSyncStatusResponseSchema,
        },
      },
      description: "Sync status retrieved successfully",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "Connector not found",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Bad Request",
    },
  },
});

export const pauseConnector = createRoute({
  tags,
  method: "post",
  path: "/{id}/pause",
  summary: "Pause connector",
  description: "Pause a connector to stop all syncing",
  request: {
    params: connectorIdParamsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: pauseResumeResponseSchema,
        },
      },
      description: "Connector paused successfully",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "Connector not found",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Bad Request",
    },
  },
});

export const resumeConnector = createRoute({
  tags,
  method: "post",
  path: "/{id}/resume",
  summary: "Resume connector",
  description: "Resume a paused connector",
  request: {
    params: connectorIdParamsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: pauseResumeResponseSchema,
        },
      },
      description: "Connector resumed successfully",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "Connector not found",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Bad Request",
    },
  },
});
