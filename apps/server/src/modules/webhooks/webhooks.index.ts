import { Hono } from "hono";
import { githubWebhook } from "./github";
import { gmailWebhook } from "./gmail";
import { googleDriveWebhook } from "./google-drive";
import { linearWebhook } from "./linear";
import { livekitWebhook } from "./livekit";
import { notionWebhook } from "./notion";
import { slackWebhook } from "./slack";
import { slackInteractivity } from "./slack-interactivity";
import { slackOptions } from "./slack-options";

const webhooks = new Hono();

webhooks.route("/github", githubWebhook);
webhooks.route("/gmail", gmailWebhook);
webhooks.route("/google-drive", googleDriveWebhook);
webhooks.route("/linear", linearWebhook);
webhooks.route("/livekit", livekitWebhook);
webhooks.route("/notion", notionWebhook);
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
