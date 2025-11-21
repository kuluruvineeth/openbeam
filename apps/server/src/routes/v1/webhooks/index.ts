/**
 * Webhook Routes
 * 
 * Receives and processes incoming webhooks from connectors.
 */

import { Hono } from "hono";
import { slackWebhook } from "./slack";

const webhookRoutes = new Hono();

// Slack webhooks
webhookRoutes.route("/slack", slackWebhook);

// Health check for webhooks
webhookRoutes.get("/health", (c) => {
  return c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

export { webhookRoutes };

