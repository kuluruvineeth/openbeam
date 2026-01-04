import { classifyQueryTool } from "./classify";
import { buildContextTool } from "./context";
import { extractEntitiesTool } from "./entities";

export { buildContextTool, classifyQueryTool, extractEntitiesTool };

export function registerDataTools(): void {
  buildContextTool.register();
  classifyQueryTool.register();
  extractEntitiesTool.register();
}
