export { ragAnalyzeTool } from "./analyze";
export { ragAnswerTool } from "./answer";
export { ragGroundTool } from "./ground";
export { pureQueryAnalyzeTool } from "./pure-analyze";
export { pureRagAnswerTool } from "./pure-answer";
export { pureVerifyGroundingTool } from "./pure-verify";
export { ragSynthesizeTool } from "./synthesize";
export { ragVerifyTool } from "./verify";

import { ragAnalyzeTool } from "./analyze";
import { ragAnswerTool } from "./answer";
import { ragGroundTool } from "./ground";
import { pureQueryAnalyzeTool } from "./pure-analyze";
import { pureRagAnswerTool } from "./pure-answer";
import { pureVerifyGroundingTool } from "./pure-verify";
import { ragSynthesizeTool } from "./synthesize";
import { ragVerifyTool } from "./verify";

export function registerRagTools(): void {
  ragAnalyzeTool.register();
  ragAnswerTool.register();
  ragGroundTool.register();
  ragSynthesizeTool.register();
  ragVerifyTool.register();
  pureQueryAnalyzeTool.register();
  pureRagAnswerTool.register();
  pureVerifyGroundingTool.register();
}
