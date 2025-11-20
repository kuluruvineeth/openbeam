import type { Hono } from "hono";
import type { AuthEnv } from "../middleware/auth";
import slackRouter from "./integrations/slack";
import v1Router from "./v1";

export const mapRoutes = (app: Hono<AuthEnv>) => {
  // Public API Version 1
  app.route("/api/v1", v1Router);

  // System Integrations (Callbacks/OAuth)
  app.route("/integrations/slack", slackRouter);

  return app;
};
