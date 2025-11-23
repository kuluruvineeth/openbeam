import { OpenAPIHono } from "@hono/zod-openapi";
import type { AuthEnv } from "@/middleware/auth";
import slack from "./slack/slack.index";

const integrations = new OpenAPIHono<AuthEnv>();

// Slack OAuth
integrations.route("/slack", slack);

// Health check for integrations
integrations.get("/health", (c) =>
  c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  })
);

export default integrations;
