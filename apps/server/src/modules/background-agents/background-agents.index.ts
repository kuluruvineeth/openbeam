import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth, requireScopes } from "@/middleware/auth";
import { API_SCOPES } from "@/types/auth";
import {
  cancelBackgroundAgentHandler,
  createBackgroundAgentHandler,
  deleteBackgroundAgentHandler,
  getBackgroundAgentHandler,
  getBackgroundAgentLogsHandler,
  listBackgroundAgentsHandler,
  pauseBackgroundAgentHandler,
  resumeBackgroundAgentHandler,
} from "./background-agents.handlers";
import {
  cancelBackgroundAgentRoute,
  createBackgroundAgentRoute,
  deleteBackgroundAgentRoute,
  getBackgroundAgentLogsRoute,
  getBackgroundAgentRoute,
  listBackgroundAgentsRoute,
  pauseBackgroundAgentRoute,
  resumeBackgroundAgentRoute,
} from "./background-agents.routes";

const backgroundAgents = new OpenAPIHono<AuthEnv>();

backgroundAgents.use("/*", requireAuth);

backgroundAgents.use("/", (c, next) => {
  if (c.req.method === "GET") {
    return requireScopes([API_SCOPES.AGENTS_READ])(c, next);
  }
  return requireScopes([API_SCOPES.AGENTS_WRITE])(c, next);
});
backgroundAgents.openapi(
  listBackgroundAgentsRoute,
  listBackgroundAgentsHandler
);
backgroundAgents.openapi(
  createBackgroundAgentRoute,
  createBackgroundAgentHandler
);

backgroundAgents.use("/:id", (c, next) => {
  if (c.req.method === "GET") {
    return requireScopes([API_SCOPES.AGENTS_READ])(c, next);
  }
  return requireScopes([API_SCOPES.AGENTS_WRITE])(c, next);
});
backgroundAgents.openapi(getBackgroundAgentRoute, getBackgroundAgentHandler);
backgroundAgents.openapi(
  deleteBackgroundAgentRoute,
  deleteBackgroundAgentHandler
);

backgroundAgents.use("/:id/logs", requireScopes([API_SCOPES.AGENTS_READ]));
backgroundAgents.openapi(
  getBackgroundAgentLogsRoute,
  getBackgroundAgentLogsHandler
);

backgroundAgents.use("/:id/pause", requireScopes([API_SCOPES.AGENTS_WRITE]));
backgroundAgents.openapi(
  pauseBackgroundAgentRoute,
  pauseBackgroundAgentHandler
);

backgroundAgents.use("/:id/resume", requireScopes([API_SCOPES.AGENTS_WRITE]));
backgroundAgents.openapi(
  resumeBackgroundAgentRoute,
  resumeBackgroundAgentHandler
);

backgroundAgents.use("/:id/cancel", requireScopes([API_SCOPES.AGENTS_WRITE]));
backgroundAgents.openapi(
  cancelBackgroundAgentRoute,
  cancelBackgroundAgentHandler
);

export default backgroundAgents;
