import { OpenAPIHono } from "@hono/zod-openapi";
import type { AuthEnv } from "@/middleware/auth";
import gmail from "./gmail/gmail.index";
import googleDrive from "./google-drive/google-drive.index";
import slack from "./slack/slack.index";

const integrations = new OpenAPIHono<AuthEnv>();

integrations.route("/gmail", gmail);
integrations.route("/google-drive", googleDrive);
integrations.route("/slack", slack);

integrations.get("/health", (c) =>
  c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  })
);

export default integrations;
