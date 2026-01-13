export { searchExportTool } from "./export";
export { searchHybridTool } from "./hybrid";
export { searchSaveTool } from "./save";
export { searchSemanticTool } from "./semantic";
export { searchSimilarTool } from "./similar";

import { searchExportTool } from "./export";
import { searchHybridTool } from "./hybrid";
import { searchSaveTool } from "./save";
import { searchSemanticTool } from "./semantic";
import { searchSimilarTool } from "./similar";

export function registerSearchTools(): void {
  searchExportTool.register();
  searchHybridTool.register();
  searchSaveTool.register();
  searchSemanticTool.register();
  searchSimilarTool.register();
}
