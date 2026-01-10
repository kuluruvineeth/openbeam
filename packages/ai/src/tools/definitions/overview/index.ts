export { overviewFanoutTool, type SubQuery } from "./fanout";
export { overviewSearchTool } from "./search";
export {
  overviewSynthesizeTool,
  type SearchResult,
  type SynthesisContext,
  type SynthesizedCitation,
} from "./synthesize";

import { overviewFanoutTool } from "./fanout";
import { overviewSearchTool } from "./search";
import { overviewSynthesizeTool } from "./synthesize";

export function registerOverviewTools(): void {
  overviewSearchTool.register();
  overviewFanoutTool.register();
  overviewSynthesizeTool.register();
}
