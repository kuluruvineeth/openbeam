import { discoverCapabilitiesTool } from "./discover-capabilities";
import { getToolInfoTool, listToolsTool } from "./get-tool-info";

export { discoverCapabilitiesTool };
export { getToolInfoTool, listToolsTool };

export function registerSystemTools(): void {
  discoverCapabilitiesTool.register();
  getToolInfoTool.register();
  listToolsTool.register();
}
