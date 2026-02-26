import {
  sandboxExecuteCodeTool,
  sandboxListFilesTool,
  sandboxReadFileTool,
  sandboxRunCommandTool,
  sandboxWriteFileTool,
} from "./tools";

export {
  sandboxExecuteCodeTool,
  sandboxListFilesTool,
  sandboxReadFileTool,
  sandboxRunCommandTool,
  sandboxWriteFileTool,
};

export function registerSandboxTools(): void {
  sandboxExecuteCodeTool.register();
  sandboxRunCommandTool.register();
  sandboxReadFileTool.register();
  sandboxWriteFileTool.register();
  sandboxListFilesTool.register();
}
