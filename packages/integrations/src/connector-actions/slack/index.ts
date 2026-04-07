import type { ConnectorActionsRegistry } from "@openbeam/types/connector-actions";
import { bookmarkActions } from "./bookmarks";
import { channelActions } from "./channels";
import { dmActions } from "./dm";
import { fileActions } from "./files";
import { messageActions } from "./messages";
import { userActions } from "./users";

export const slackActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "slack",
  connectorName: "Slack",
  connectorIcon: "slack",
  actions: [
    ...messageActions,
    ...channelActions,
    ...userActions,
    ...fileActions,
    ...dmActions,
    ...bookmarkActions,
  ],
};
