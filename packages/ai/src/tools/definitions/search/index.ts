export { searchExportTool } from "./export";
export { searchHybridTool } from "./hybrid";
export { searchSaveTool } from "./save";
export { scrapePageTool } from "./scrape";
export { searchSemanticTool } from "./semantic";
export { searchSimilarTool } from "./similar";
export { searchWebTool } from "./web";

import { searchExportTool } from "./export";
import { searchHybridTool } from "./hybrid";
import { searchSaveTool } from "./save";
import { scrapePageTool } from "./scrape";
import { searchSemanticTool } from "./semantic";
import { searchSimilarTool } from "./similar";
import { searchWebTool } from "./web";

export function registerSearchTools(): void {
  searchExportTool.register();
  searchHybridTool.register();
  searchSaveTool.register();
  scrapePageTool.register();
  searchSemanticTool.register();
  searchSimilarTool.register();
  searchWebTool.register();
}
