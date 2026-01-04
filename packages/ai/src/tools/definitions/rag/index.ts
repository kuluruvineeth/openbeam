export { ragAnalyzeTool } from "./analyze";
export { ragAnswerTool } from "./answer";
export { pureQueryAnalyzeTool } from "./pure-analyze";
export { pureRagAnswerTool } from "./pure-answer";
export { pureVerifyGroundingTool } from "./pure-verify";
export { ragVerifyTool } from "./verify";

import { ragAnalyzeTool } from "./analyze";
import { ragAnswerTool } from "./answer";
import { pureQueryAnalyzeTool } from "./pure-analyze";
import { pureRagAnswerTool } from "./pure-answer";
import { pureVerifyGroundingTool } from "./pure-verify";
import { ragVerifyTool } from "./verify";

export function registerRagTools(): void {
  ragAnalyzeTool.register();
  ragAnswerTool.register();
  ragVerifyTool.register();
  pureQueryAnalyzeTool.register();
  pureRagAnswerTool.register();
  pureVerifyGroundingTool.register();
}
