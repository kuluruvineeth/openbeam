import type { ConnectorActionsRegistry } from "@openbeam/types/connector-actions";
import { draftActions } from "./drafts";
import { emailActions } from "./emails";
import { labelActions } from "./labels";
import { messageActions } from "./messages";
import { threadActions } from "./threads";

export const gmailActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "gmail",
  connectorName: "Gmail",
  connectorIcon: "gmail",
  actions: [
    ...emailActions,
    ...messageActions,
    ...draftActions,
    ...threadActions,
    ...labelActions,
  ],
};
