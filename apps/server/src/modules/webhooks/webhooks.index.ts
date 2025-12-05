import { Hono } from "hono";
import { slackWebhook } from "./slack";

const webhooks = new Hono();

webhooks.route("/slack", slackWebhook);

webhooks.get("/health", (c) =>
  c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  })
);

export default webhooks;
