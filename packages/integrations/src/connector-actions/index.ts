import type { ConnectorActionsRegistry } from "@openbeam/types/canvas";
import { awsIotActionsRegistry } from "./aws-iot";
import { confluenceActionsRegistry } from "./confluence";
import { githubActionsRegistry } from "./github";
import { gmailActionsRegistry } from "./gmail";
import { googleCalendarActionsRegistry } from "./google-calendar";
import { googleDriveActionsRegistry } from "./google-drive";
import { jiraActionsRegistry } from "./jira";
import { linearActionsRegistry } from "./linear";
import { microsoftCalendarActionsRegistry } from "./microsoft-calendar";
import { notionActionsRegistry } from "./notion";
import { outlookActionsRegistry } from "./outlook";
import { salesforceActionsRegistry } from "./salesforce";
import { samsaraActionsRegistry } from "./samsara";
import { sharePointActionsRegistry } from "./sharepoint";
import { slackActionsRegistry } from "./slack";
import { smartThingsActionsRegistry } from "./smartthings";
import { teamsActionsRegistry } from "./teams";
import { verkadaActionsRegistry } from "./verkada";

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
  samsaraActionsRegistry,
  verkadaActionsRegistry,
  awsIotActionsRegistry,
  smartThingsActionsRegistry,
  microsoftCalendarActionsRegistry,
];
