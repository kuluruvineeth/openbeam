import type { ConnectorActionsRegistry } from "@openbeam/types/connector-actions";
import { cycleActions } from "./cycles";
import { issueActions } from "./issues";
import { projectActions } from "./projects";
import { teamActions } from "./teams";

export const linearActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "linear",
  connectorName: "Linear",
  connectorIcon: "linear",
  actions: [
    ...issueActions,
    ...projectActions,
    ...cycleActions,
    ...teamActions,
  ],
};
