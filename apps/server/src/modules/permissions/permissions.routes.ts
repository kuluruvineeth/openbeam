import { createRoute } from "@hono/zod-openapi";
import {
  connectorIdParamsSchema,
  documentIdParamsSchema,
  errorSchema,
  invalidateCacheBodySchema,
  successSchema,
  userQuerySchema,
} from "./permissions.schema";

const tags = ["Permissions"];

export const getSyncStatusRoute = createRoute({
  tags,
  method: "get",
  path: "/sync-status/{connectorId}",
  summary: "Get sync status",
  request: {
    params: connectorIdParamsSchema,
  },
  responses: {
    200: { description: "Sync status fetched" },
  },
});

export const listSyncStatusesRoute = createRoute({
  tags,
  method: "get",
  path: "/sync-statuses",
  summary: "List sync statuses",
  responses: {
    200: { description: "Sync statuses listed" },
  },
});

export const invalidateCacheRoute = createRoute({
  tags,
  method: "post",
  path: "/cache/invalidate",
  summary: "Invalidate permissions cache",
  request: {
    body: {
      content: {
        "application/json": {
          schema: invalidateCacheBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: successSchema,
        },
      },
      description: "Cache invalidated",
    },
    400: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Bad Request",
    },
    403: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Forbidden",
    },
  },
});

export const getMyPermissionsRoute = createRoute({
  tags,
  method: "get",
  path: "/me",
  summary: "Get my permissions",
  responses: {
    200: {
      description: "Permissions resolved",
    },
  },
});

export const getDocumentPermissionsRoute = createRoute({
  tags,
  method: "get",
  path: "/documents/{documentId}",
  summary: "Get document permissions",
  request: {
    params: documentIdParamsSchema,
  },
  responses: {
    200: {
      description: "Document permissions fetched",
    },
  },
});

export const getUserGroupsRoute = createRoute({
  tags,
  method: "get",
  path: "/users/groups",
  summary: "Get user groups",
  request: {
    query: userQuerySchema,
  },
  responses: {
    200: {
      description: "User groups fetched",
    },
    403: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Forbidden",
    },
  },
});

export const getUserConnectorScopesRoute = createRoute({
  tags,
  method: "get",
  path: "/users/scopes",
  summary: "Get user connector scopes",
  request: {
    query: userQuerySchema,
  },
  responses: {
    200: {
      description: "User connector scopes fetched",
    },
    403: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Forbidden",
    },
  },
});

export const getStatsRoute = createRoute({
  tags,
  method: "get",
  path: "/stats",
  summary: "Get permissions stats",
  responses: {
    200: {
      description: "Permission stats fetched",
    },
    403: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Forbidden",
    },
  },
});
