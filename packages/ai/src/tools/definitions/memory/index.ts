export { clearMemoryToolDeps } from "./deps";
export { memoryForgetTool, setPersistentMemoryForForget } from "./forget";
export { memoryRecallTool, setPersistentMemoryForRecall } from "./recall";
export { searchMemoryTool, setMemoryStore } from "./search";
export { getSessionStateTool, setSessionStateStore } from "./session";
export { memoryStoreTool, setPersistentMemoryForStore } from "./store";
export {
  memorySummarizeTool,
  setSessionMemoryForSummarize,
  setSummarizerDeps,
} from "./summarize";

import { memoryForgetTool } from "./forget";
import { memoryRecallTool } from "./recall";
import { searchMemoryTool } from "./search";
import { getSessionStateTool } from "./session";
import { memoryStoreTool } from "./store";
import { memorySummarizeTool } from "./summarize";

export function registerMemoryTools(): void {
  searchMemoryTool.register();
  getSessionStateTool.register();
  memoryStoreTool.register();
  memoryRecallTool.register();
  memorySummarizeTool.register();
  memoryForgetTool.register();
}
