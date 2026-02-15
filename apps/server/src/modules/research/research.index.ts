import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth, requireScopes } from "@/middleware/auth";
import { API_SCOPES } from "@/types/auth";
import {
  cancelResearchHandler,
  getResearchArtifactsHandler,
  getResearchProgressHandler,
  startResearchHandler,
} from "./research.handlers";
import {
  cancelResearchRoute,
  getResearchArtifactsRoute,
  getResearchProgressRoute,
  startResearchRoute,
} from "./research.routes";

const research = new OpenAPIHono<AuthEnv>();

research.use("/*", requireAuth);

research.use("/start", requireScopes([API_SCOPES.RESEARCH_WRITE]));
research.openapi(startResearchRoute, startResearchHandler);

research.use(
  "/:workflowId/progress",
  requireScopes([API_SCOPES.RESEARCH_READ])
);
research.openapi(getResearchProgressRoute, getResearchProgressHandler);

research.use(
  "/:workflowId/artifacts",
  requireScopes([API_SCOPES.RESEARCH_READ])
);
research.openapi(getResearchArtifactsRoute, getResearchArtifactsHandler);

research.use("/:workflowId/cancel", requireScopes([API_SCOPES.RESEARCH_WRITE]));
research.openapi(cancelResearchRoute, cancelResearchHandler);

export default research;
