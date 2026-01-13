export { connectorListTool } from "./list";
export { connectorPauseTool } from "./pause";
export { connectorResumeTool } from "./resume";
export { connectorStatusTool } from "./status";
export { connectorSyncTool } from "./sync";
export { connectorSyncHistoryTool } from "./sync-history";
export { connectorSyncStatusTool } from "./sync-status";

import { connectorListTool } from "./list";
import { connectorPauseTool } from "./pause";
import { connectorResumeTool } from "./resume";
import { connectorStatusTool } from "./status";
import { connectorSyncTool } from "./sync";
import { connectorSyncHistoryTool } from "./sync-history";
import { connectorSyncStatusTool } from "./sync-status";

export function registerConnectorTools(): void {
  connectorListTool.register();
  connectorPauseTool.register();
  connectorResumeTool.register();
  connectorStatusTool.register();
  connectorSyncTool.register();
  connectorSyncHistoryTool.register();
  connectorSyncStatusTool.register();
}
