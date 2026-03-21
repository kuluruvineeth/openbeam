import { OpenAPIHono } from "@hono/zod-openapi";
import type { AuthEnv } from "@/middleware/auth";
import awsIot from "./aws-iot/aws-iot.index";
import azureIot from "./azure-iot/azure-iot.index";
import confluence from "./confluence/confluence.index";
import github from "./github/github.index";
import gmail from "./gmail/gmail.index";
import googleCalendar from "./google-calendar/google-calendar.index";
import googleDrive from "./google-drive/google-drive.index";
import jira from "./jira/jira.index";
import linear from "./linear/linear.index";
import microsoftCalendar from "./microsoft-calendar/microsoft-calendar.index";
import notion from "./notion/notion.index";
import outlook from "./outlook/outlook.index";
import salesforce from "./salesforce/salesforce.index";
import samsara from "./samsara/samsara.index";
import servicenow from "./servicenow/servicenow.index";
import sharepoint from "./sharepoint/sharepoint.index";
import slack from "./slack/slack.index";
import smartthings from "./smartthings/smartthings.index";
import teams from "./teams/teams.index";
import verkada from "./verkada/verkada.index";
import zendesk from "./zendesk/zendesk.index";

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
integrations.route("/outlook", outlook);
integrations.route("/sharepoint", sharepoint);
integrations.route("/teams", teams);
integrations.route("/confluence", confluence);
integrations.route("/jira", jira);
integrations.route("/salesforce", salesforce);
integrations.route("/google-calendar", googleCalendar);
integrations.route("/microsoft-calendar", microsoftCalendar);
integrations.route("/servicenow", servicenow);
integrations.route("/zendesk", zendesk);

integrations.get("/health", (c) =>
  c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  })
);

export default integrations;
