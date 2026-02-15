import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth, requireScopes } from "@/middleware/auth";
import { API_SCOPES } from "@/types/auth";
import {
  getDocumentPermissionsHandler,
  getMyPermissionsHandler,
  getStatsHandler,
  getSyncStatusHandler,
  getUserConnectorScopesHandler,
  getUserGroupsHandler,
  invalidateCacheHandler,
  listSyncStatusesHandler,
} from "./permissions.handlers";
import {
  getDocumentPermissionsRoute,
  getMyPermissionsRoute,
  getStatsRoute,
  getSyncStatusRoute,
  getUserConnectorScopesRoute,
  getUserGroupsRoute,
  invalidateCacheRoute,
  listSyncStatusesRoute,
} from "./permissions.routes";

const permissions = new OpenAPIHono<AuthEnv>();

permissions.use("/*", requireAuth);

permissions.use("/sync-statuses", requireScopes([API_SCOPES.PERMISSIONS_READ]));
permissions.openapi(listSyncStatusesRoute, listSyncStatusesHandler);

permissions.use(
  "/sync-status/:connectorId",
  requireScopes([API_SCOPES.PERMISSIONS_READ])
);
permissions.openapi(getSyncStatusRoute, getSyncStatusHandler);

permissions.use(
  "/cache/invalidate",
  requireScopes([API_SCOPES.PERMISSIONS_WRITE])
);
permissions.openapi(invalidateCacheRoute, invalidateCacheHandler);

permissions.use("/me", requireScopes([API_SCOPES.PERMISSIONS_READ]));
permissions.openapi(getMyPermissionsRoute, getMyPermissionsHandler);

permissions.use(
  "/documents/:documentId",
  requireScopes([API_SCOPES.PERMISSIONS_READ])
);
permissions.openapi(getDocumentPermissionsRoute, getDocumentPermissionsHandler);

permissions.use("/users/groups", requireScopes([API_SCOPES.PERMISSIONS_READ]));
permissions.openapi(getUserGroupsRoute, getUserGroupsHandler);

permissions.use("/users/scopes", requireScopes([API_SCOPES.PERMISSIONS_READ]));
permissions.openapi(getUserConnectorScopesRoute, getUserConnectorScopesHandler);

permissions.use("/stats", requireScopes([API_SCOPES.PERMISSIONS_READ]));
permissions.openapi(getStatsRoute, getStatsHandler);

export default permissions;
