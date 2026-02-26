import { OpenAPIHono } from "@hono/zod-openapi";
import type { AuthEnv } from "@/middleware/auth";
import github from "./github/github.index";
import gmail from "./gmail/gmail.index";
import googleDrive from "./google-drive/google-drive.index";
import linear from "./linear/linear.index";
import notion from "./notion/notion.index";
import slack from "./slack/slack.index";

const integrations = new OpenAPIHono<AuthEnv>();

integrations.route("/gmail", gmail);
integrations.route("/github", github);
integrations.route("/google-drive", googleDrive);
integrations.route("/linear", linear);
integrations.route("/notion", notion);
integrations.route("/slack", slack);

integrations.get("/health", (c) =>
  c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  })
);

export default integrations;
