import type { ConnectorActionsRegistry } from "@openplane/types/canvas";

import { gmailActionsRegistry } from "./gmail";
import { googleDriveActionsRegistry } from "./google-drive";
import { linearActionsRegistry } from "./linear";
import { notionActionsRegistry } from "./notion";
import { slackActionsRegistry } from "./slack";

export const ALL_CONNECTOR_ACTION_REGISTRIES: ConnectorActionsRegistry[] = [
  slackActionsRegistry,
  gmailActionsRegistry,
  notionActionsRegistry,
  googleDriveActionsRegistry,
  linearActionsRegistry,
];
