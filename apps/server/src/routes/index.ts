import type { OpenAPIHono } from "@hono/zod-openapi";
import type { AuthEnv } from "@/middleware/auth";
import integrations from "@/modules/integrations/integrations.index";
import v1Router from "./v1";

export const mapRoutes = (app: OpenAPIHono<AuthEnv>) => {
  // Public API Version 1
  app.route("/api/v1", v1Router);

  // System Integrations (OAuth flows)
  app.route("/integrations", integrations);

  return app;
};
