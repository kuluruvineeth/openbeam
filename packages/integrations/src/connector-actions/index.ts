import type { ConnectorActionsRegistry } from "@openbeam/types/canvas";
import { confluenceActionsRegistry } from "./confluence";
import { githubActionsRegistry } from "./github";
import { gmailActionsRegistry } from "./gmail";
import { googleCalendarActionsRegistry } from "./google-calendar";
import { googleDriveActionsRegistry } from "./google-drive";
import { jiraActionsRegistry } from "./jira";
import { linearActionsRegistry } from "./linear";
import { notionActionsRegistry } from "./notion";
import { outlookActionsRegistry } from "./outlook";
import { salesforceActionsRegistry } from "./salesforce";
import { sharePointActionsRegistry } from "./sharepoint";
import { slackActionsRegistry } from "./slack";
import { teamsActionsRegistry } from "./teams";

export const ALL_CONNECTOR_ACTION_REGISTRIES: ConnectorActionsRegistry[] = [
  slackActionsRegistry,
  gmailActionsRegistry,
  githubActionsRegistry,
  notionActionsRegistry,
  googleDriveActionsRegistry,
  linearActionsRegistry,
  jiraActionsRegistry,
  confluenceActionsRegistry,
  salesforceActionsRegistry,
  googleCalendarActionsRegistry,
  outlookActionsRegistry,
  sharePointActionsRegistry,
  teamsActionsRegistry,
];
