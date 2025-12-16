import { Hono } from "hono";
import { slackWebhook } from "./slack";
import { slackInteractivity } from "./slack-interactivity";
import { slackOptions } from "./slack-options";

const webhooks = new Hono();

webhooks.route("/slack", slackWebhook);
webhooks.route("/slack/interactivity", slackInteractivity);
webhooks.route("/slack/options", slackOptions);

webhooks.get("/health", (c) =>
  c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  })
);

export default webhooks;
