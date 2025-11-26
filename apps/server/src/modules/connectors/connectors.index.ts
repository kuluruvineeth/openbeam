import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth, requireScopes } from "@/middleware/auth";
import { API_SCOPES } from "@/types/auth";
import {
  getSyncHistoryHandler,
  getSyncStatusHandler,
  pauseConnectorHandler,
  resumeConnectorHandler,
  triggerSyncHandler,
} from "./connectors.handlers";
import {
  getSyncHistory,
  getSyncStatus,
  pauseConnector,
  resumeConnector,
  triggerSync,
} from "./connectors.routes";
import oauth from "./oauth/oauth.index";

const connectors = new OpenAPIHono<AuthEnv>();

// OAuth routes - mounted first before auth middleware
// OAuth callback doesn't require auth (uses state token for CSRF)
connectors.route("/oauth", oauth);

// Apply Auth Middleware to remaining routes
connectors.use("/:id/*", requireAuth);

// Trigger Sync
connectors.use("/:id/sync", requireScopes([API_SCOPES.CONNECTORS_SYNC]));
connectors.openapi(triggerSync, triggerSyncHandler);

// Get Sync History
connectors.use(
  "/:id/sync-history",
  requireScopes([API_SCOPES.CONNECTORS_READ])
);
connectors.openapi(getSyncHistory, getSyncHistoryHandler);

// Get Sync Status
connectors.use("/:id/sync-status", requireScopes([API_SCOPES.CONNECTORS_READ]));
connectors.openapi(getSyncStatus, getSyncStatusHandler);

// Pause Connector
connectors.use("/:id/pause", requireScopes([API_SCOPES.CONNECTORS_WRITE]));
connectors.openapi(pauseConnector, pauseConnectorHandler);

// Resume Connector
connectors.use("/:id/resume", requireScopes([API_SCOPES.CONNECTORS_WRITE]));
connectors.openapi(resumeConnector, resumeConnectorHandler);

export default connectors;
