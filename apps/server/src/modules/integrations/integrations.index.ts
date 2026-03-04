import { OpenAPIHono } from "@hono/zod-openapi";
import type { AuthEnv } from "@/middleware/auth";
import awsIot from "./aws-iot/aws-iot.index";
import azureIot from "./azure-iot/azure-iot.index";
import github from "./github/github.index";
import gmail from "./gmail/gmail.index";
import googleDrive from "./google-drive/google-drive.index";
import linear from "./linear/linear.index";
import notion from "./notion/notion.index";
import samsara from "./samsara/samsara.index";
import slack from "./slack/slack.index";
import smartthings from "./smartthings/smartthings.index";
import verkada from "./verkada/verkada.index";

const integrations = new OpenAPIHono<AuthEnv>();

integrations.route("/gmail", gmail);
integrations.route("/github", github);
integrations.route("/google-drive", googleDrive);
integrations.route("/linear", linear);
integrations.route("/notion", notion);
integrations.route("/samsara", samsara);
integrations.route("/slack", slack);
integrations.route("/verkada", verkada);
integrations.route("/aws-iot", awsIot);
integrations.route("/azure-iot", azureIot);
integrations.route("/smartthings", smartthings);

integrations.get("/health", (c) =>
  c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  })
);

export default integrations;
