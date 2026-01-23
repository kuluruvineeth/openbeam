export { canvasAddNodeTool } from "./add-node";
export { canvasAutoLayoutTool } from "./auto-layout";
export { canvasConnectNodesTool } from "./connect-nodes";
export { canvasDisconnectNodesTool } from "./disconnect-nodes";
export {
  canvasGetNodeSchemaTool,
  canvasListConnectorsTool,
  canvasListNodeTypesTool,
} from "./discovery";
export { canvasGetStateTool } from "./get-state";
export { canvasRemoveNodeTool } from "./remove-node";
export { canvasUpdateConfigTool } from "./update-config";
export { canvasValidateTool } from "./validate";

import { canvasAddNodeTool } from "./add-node";
import { canvasAutoLayoutTool } from "./auto-layout";
import { canvasConnectNodesTool } from "./connect-nodes";
import { canvasDisconnectNodesTool } from "./disconnect-nodes";
import {
  canvasGetNodeSchemaTool,
  canvasListConnectorsTool,
  canvasListNodeTypesTool,
} from "./discovery";
import { canvasGetStateTool } from "./get-state";
import { canvasRemoveNodeTool } from "./remove-node";
import { canvasUpdateConfigTool } from "./update-config";
import { canvasValidateTool } from "./validate";

export function registerCanvasTools(): void {
  canvasAddNodeTool.register();
  canvasAutoLayoutTool.register();
  canvasConnectNodesTool.register();
  canvasDisconnectNodesTool.register();
  canvasGetNodeSchemaTool.register();
  canvasGetStateTool.register();
  canvasListConnectorsTool.register();
  canvasListNodeTypesTool.register();
  canvasRemoveNodeTool.register();
  canvasUpdateConfigTool.register();
  canvasValidateTool.register();
}
