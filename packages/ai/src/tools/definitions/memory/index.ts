export { searchMemoryTool, setMemoryStore } from "./search";
export { getSessionStateTool, setSessionStateStore } from "./session";

import { searchMemoryTool } from "./search";
import { getSessionStateTool } from "./session";

export function registerMemoryTools(): void {
  searchMemoryTool.register();
  getSessionStateTool.register();
}
