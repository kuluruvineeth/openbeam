export type { WorkflowAnalysis } from "./analysis-tools";
export {
  analysisTools,
  canvasAnalyzeWorkflowTool,
  canvasFindSimilarNodesTool,
  canvasValidateWorkflowTool,
} from "./analysis-tools";

export {
  canvasCreateConnectionTool,
  canvasDeleteConnectionsTool,
  canvasFindPathTool,
  canvasReconnectTool,
  canvasUpdateConnectionTool,
  connectionTools,
} from "./connection-tools";
export {
  canvasGenerateFromTemplateTool,
  canvasGenerateWorkflowTool,
  canvasSuggestNextNodeTool,
  generationTools,
} from "./generation-tools";

export {
  canvasAlignNodesTool,
  canvasAutoLayoutTool,
  canvasDistributeNodesTool,
  layoutTools,
} from "./layout-tools";
export {
  canvasCreateNodeTool,
  canvasDeleteNodesTool,
  canvasDuplicateNodesTool,
  canvasGroupNodesTool,
  canvasMoveNodesTool,
  canvasUngroupNodesTool,
  canvasUpdateNodeTool,
  nodeTools,
} from "./node-tools";
export {
  canvasGetNodeStatsTool,
  canvasGetNodeTool,
  canvasGetSelectionTool,
  canvasGetStateTool,
  canvasQueryNodesTool,
  canvasSetSelectionTool,
  queryTools,
} from "./query-tools";

export {
  canvasApplyTemplateTool,
  canvasExportWorkflowTool,
  canvasImportWorkflowTool,
  canvasListTemplatesTool,
  canvasSaveAsTemplateTool,
  templateTools,
} from "./template-tools";

import { analysisTools } from "./analysis-tools";
import { connectionTools } from "./connection-tools";
import { generationTools } from "./generation-tools";
import { layoutTools } from "./layout-tools";
import { nodeTools } from "./node-tools";
import { queryTools } from "./query-tools";
import { templateTools } from "./template-tools";

export const allCanvasTools = [
  ...nodeTools,
  ...connectionTools,
  ...queryTools,
  ...layoutTools,
  ...generationTools,
  ...analysisTools,
  ...templateTools,
];

export function registerAllCanvasTools(): void {
  for (const tool of allCanvasTools) {
    tool.register();
  }
}
