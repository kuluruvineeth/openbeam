import { Hono } from "hono";
import { slackWebhook } from "./slack";

const webhooks = new Hono();

// Slack webhooks
webhooks.route("/slack", slackWebhook);

// Health check for webhooks
webhooks.get("/health", (c) =>
  c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  })
);

export default webhooks;
