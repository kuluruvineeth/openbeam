import type { ConnectorActionsRegistry } from "@openbeam/types/canvas";
import { confluenceActionsRegistry } from "./confluence";
import { githubActionsRegistry } from "./github";
import { gmailActionsRegistry } from "./gmail";
import { googleDriveActionsRegistry } from "./google-drive";
import { jiraActionsRegistry } from "./jira";
import { linearActionsRegistry } from "./linear";
import { notionActionsRegistry } from "./notion";
import { slackActionsRegistry } from "./slack";

export const ALL_CONNECTOR_ACTION_REGISTRIES: ConnectorActionsRegistry[] = [
  slackActionsRegistry,
  gmailActionsRegistry,
  githubActionsRegistry,
  notionActionsRegistry,
  googleDriveActionsRegistry,
  linearActionsRegistry,
  jiraActionsRegistry,
  confluenceActionsRegistry,
];
