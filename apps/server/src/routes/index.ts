import type { OpenAPIHono } from "@hono/zod-openapi";
import type { AuthEnv } from "@/middleware/auth";
import admin from "@/modules/admin/admin.index";
import agent from "@/modules/agent/agent.index";
import health from "@/modules/health/health.index";
import integrations from "@/modules/integrations/integrations.index";
import mcp from "@/modules/mcp/mcp.index";
import v1Router from "./v1";

export const mapRoutes = (app: OpenAPIHono<AuthEnv>) => {
  // Public API Version 1
  app.route("/api/v1", v1Router);

  // System Integrations (OAuth flows)
  app.route("/integrations", integrations);

  // Admin routes (queue management, monitoring)
  app.route("/admin", admin);

  // Health API (public)
  app.route("/api/health", health);

  // MCP API (authenticated)
  app.route("/api/mcp", mcp);

  // Agent API (authenticated, SSE streaming)
  app.route("/api/agent", agent);

  return app;
};
