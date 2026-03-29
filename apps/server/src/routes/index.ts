import type { OpenAPIHono } from "@hono/zod-openapi";
import type { AuthEnv } from "@/middleware/auth";
import agent from "@/modules/agent/agent.index";
import health from "@/modules/health/health.index";
import integrations from "@/modules/integrations/integrations.index";
import mcp from "@/modules/mcp/mcp.index";

import v1Router from "./v1";

export const mapRoutes = (app: OpenAPIHono<AuthEnv>) => {
  app.route("/api/v1", v1Router);
  app.route("/integrations", integrations);
  app.route("/api/health", health);
  app.route("/api/mcp", mcp);
  app.route("/api/agent", agent);
  return app;
};
