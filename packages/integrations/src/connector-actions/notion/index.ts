import type { ConnectorActionsRegistry } from "@openbeam/types/connector-actions";
import { blockActions } from "./blocks";
import { commentActions } from "./comments";
import { databaseActions } from "./databases";
import { pageActions } from "./pages";
import { workspaceActions } from "./workspace";

export const notionActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "notion",
  connectorName: "Notion",
  connectorIcon: "notion",
  actions: [
    ...databaseActions,
    ...pageActions,
    ...blockActions,
    ...workspaceActions,
    ...commentActions,
  ],
};
