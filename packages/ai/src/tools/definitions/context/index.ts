import { virtualFileListTool, virtualFileReadTool } from "./virtual-file";
import { workspaceDeleteTool, workspaceWriteTool } from "./workspace";

export { virtualFileListTool, virtualFileReadTool };
export { workspaceDeleteTool, workspaceWriteTool };

export function registerContextTools(): void {
  virtualFileReadTool.register();
  virtualFileListTool.register();
  workspaceWriteTool.register();
  workspaceDeleteTool.register();
}
