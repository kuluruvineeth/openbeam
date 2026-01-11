export { connectorListTool } from "./list";
export { connectorStatusTool } from "./status";
export { connectorSyncTool } from "./sync";
export { connectorSyncStatusTool } from "./sync-status";

import { connectorListTool } from "./list";
import { connectorStatusTool } from "./status";
import { connectorSyncTool } from "./sync";
import { connectorSyncStatusTool } from "./sync-status";

export function registerConnectorTools(): void {
  connectorListTool.register();
  connectorStatusTool.register();
  connectorSyncStatusTool.register();
  connectorSyncTool.register();
}
