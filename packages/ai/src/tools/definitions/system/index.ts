import { getToolInfoTool, listToolsTool } from "./get-tool-info";

export { getToolInfoTool, listToolsTool };

export function registerSystemTools(): void {
  getToolInfoTool.register();
  listToolsTool.register();
}
