import { virtualFileListTool, virtualFileReadTool } from "./virtual-file";

export { virtualFileListTool, virtualFileReadTool };

export function registerContextTools(): void {
  virtualFileReadTool.register();
  virtualFileListTool.register();
}
