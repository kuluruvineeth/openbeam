export { searchHybridTool } from "./hybrid";
export { searchSemanticTool } from "./semantic";
export { searchSimilarTool } from "./similar";

import { searchHybridTool } from "./hybrid";
import { searchSemanticTool } from "./semantic";
import { searchSimilarTool } from "./similar";

export function registerSearchTools(): void {
  searchHybridTool.register();
  searchSemanticTool.register();
  searchSimilarTool.register();
}
