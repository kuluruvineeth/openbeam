import type { ConnectorActionsRegistry } from "@openplane/types/canvas";

import { gmailActions } from "./gmail";
import { googleDriveActions } from "./google-drive";
import { linearActions } from "./linear";
import { notionActions } from "./notion";
import { slackActions } from "./slack";

export {
  gmailActions,
  googleDriveActions,
  linearActions,
  notionActions,
  slackActions,
};

export const ALL_CONNECTOR_ACTION_REGISTRIES: ConnectorActionsRegistry[] = [
  gmailActions,
  googleDriveActions,
  linearActions,
  notionActions,
  slackActions,
];
