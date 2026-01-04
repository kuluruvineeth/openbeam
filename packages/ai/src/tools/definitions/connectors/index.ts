export { connectorListTool } from "./list";
export { connectorStatusTool } from "./status";
export { connectorSyncTool } from "./sync";

import { connectorListTool } from "./list";
import { connectorStatusTool } from "./status";
import { connectorSyncTool } from "./sync";

export function registerConnectorTools(): void {
  connectorListTool.register();
  connectorStatusTool.register();
  connectorSyncTool.register();
}
