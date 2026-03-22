import type { ConnectorActionsRegistry } from "@openbeam/types/canvas";
import { asanaActionsRegistry } from "./asana";
import { awsIotActionsRegistry } from "./aws-iot";
import { bitbucketActionsRegistry } from "./bitbucket";
import { boxActionsRegistry } from "./box";
import { clickUpActionsRegistry } from "./clickup";
import { confluenceActionsRegistry } from "./confluence";
import { dropboxActionsRegistry } from "./dropbox";
import { figmaActionsRegistry } from "./figma";
import { githubActionsRegistry } from "./github";
import { gitlabActionsRegistry } from "./gitlab";
import { gmailActionsRegistry } from "./gmail";
import { googleCalendarActionsRegistry } from "./google-calendar";
import { googleChatActionsRegistry } from "./google-chat";
import { googleDriveActionsRegistry } from "./google-drive";
import { hubspotActionsRegistry } from "./hubspot";
import { intercomActionsRegistry } from "./intercom";
import { jiraActionsRegistry } from "./jira";
import { linearActionsRegistry } from "./linear";
import { microsoftCalendarActionsRegistry } from "./microsoft-calendar";
import { mondayActionsRegistry } from "./monday";
import { notionActionsRegistry } from "./notion";
import { outlookActionsRegistry } from "./outlook";
import { pagerdutyActionsRegistry } from "./pagerduty";
import { salesforceActionsRegistry } from "./salesforce";
import { samsaraActionsRegistry } from "./samsara";
import { servicenowActionsRegistry } from "./servicenow";
import { sharePointActionsRegistry } from "./sharepoint";
import { slackActionsRegistry } from "./slack";
import { smartThingsActionsRegistry } from "./smartthings";
import { teamsActionsRegistry } from "./teams";
import { verkadaActionsRegistry } from "./verkada";
import { zendeskActionsRegistry } from "./zendesk";
import { zoomActionsRegistry } from "./zoom";

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
  googleChatActionsRegistry,
  outlookActionsRegistry,
  sharePointActionsRegistry,
  teamsActionsRegistry,
  samsaraActionsRegistry,
  verkadaActionsRegistry,
  awsIotActionsRegistry,
  smartThingsActionsRegistry,
  microsoftCalendarActionsRegistry,
  servicenowActionsRegistry,
  zendeskActionsRegistry,
  dropboxActionsRegistry,
  boxActionsRegistry,
  asanaActionsRegistry,
  hubspotActionsRegistry,
  figmaActionsRegistry,
  gitlabActionsRegistry,
  intercomActionsRegistry,
  zoomActionsRegistry,
  bitbucketActionsRegistry,
  mondayActionsRegistry,
  pagerdutyActionsRegistry,
  clickUpActionsRegistry,
];
