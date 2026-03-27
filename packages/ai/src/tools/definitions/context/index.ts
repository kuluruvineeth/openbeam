import { contextBrowseTool } from "./browse";
import { contextReadTool } from "./read";
import { contextSearchTool } from "./search";
import { contextStoreTool } from "./store";
import { virtualFileListTool, virtualFileReadTool } from "./virtual-file";
import { workspaceDeleteTool, workspaceWriteTool } from "./workspace";

export { contextBrowseTool };
export { contextReadTool };
export { contextSearchTool };
export { contextStoreTool };
export { virtualFileListTool, virtualFileReadTool };
export { workspaceDeleteTool, workspaceWriteTool };

export function registerContextTools(): void {
  virtualFileReadTool.register();
  virtualFileListTool.register();
  workspaceWriteTool.register();
  workspaceDeleteTool.register();
  contextSearchTool.register();
  contextReadTool.register();
  contextStoreTool.register();
  contextBrowseTool.register();
}
