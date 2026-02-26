import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const sandboxExecuteCodeTool = defineTool({
  name: "sandbox_execute_code",
  description: `Execute code in an isolated sandbox environment.

USE THIS WHEN:
- Agent needs to run Python, JavaScript, or Bash code
- Agent needs to test code, run calculations, or process data
- Agent needs to install packages and run scripts

RETURNS: Execution result with output, error (if any), logs, and artifacts.`,
  category: "action",
  stakes: "high",
  reversibility: "hard",
  deferLoading: true,
  searchKeywords: [
    "sandbox",
    "execute",
    "code",
    "run",
    "python",
    "javascript",
    "bash",
  ],

  parameters: z.object({
    code: z.string().min(1).describe("The code to execute"),
    language: z
      .enum(["python", "javascript", "bash"])
      .optional()
      .default("python")
      .describe("Programming language"),
  }),

  async execute(params, ctx) {
    if (!ctx.services.sandbox) {
      return failure("INVALID_STATE", "No sandbox session available");
    }

    const result = await ctx.services.sandbox.executeCode(
      params.code,
      params.language
    );

    return success(result);
  },
});

export const sandboxRunCommandTool = defineTool({
  name: "sandbox_run_command",
  description: `Run a shell command in an isolated sandbox environment.

USE THIS WHEN:
- Agent needs to run shell commands (git, curl, ls, etc.)
- Agent needs to install system packages
- Agent needs to manipulate files via CLI tools

RETURNS: Process result with exit code, stdout, stderr, and duration.`,
  category: "action",
  stakes: "high",
  reversibility: "hard",
  deferLoading: true,
  searchKeywords: ["sandbox", "command", "shell", "run", "terminal", "bash"],

  parameters: z.object({
    command: z.string().min(1).describe("The shell command to run"),
    cwd: z.string().optional().describe("Working directory"),
    env: z
      .record(z.string(), z.string())
      .optional()
      .describe("Environment variables"),
  }),

  async execute(params, ctx) {
    if (!ctx.services.sandbox) {
      return failure("INVALID_STATE", "No sandbox session available");
    }

    const result = await ctx.services.sandbox.runCommand(params.command, {
      cwd: params.cwd,
      env: params.env,
    });

    return success(result);
  },
});

export const sandboxReadFileTool = defineTool({
  name: "sandbox_read_file",
  description: `Read a file from the sandbox filesystem.

USE THIS WHEN:
- Agent needs to read file contents from the sandbox
- Agent needs to inspect output files after code execution

RETURNS: File contents as a string.`,
  category: "action",
  stakes: "low",
  reversibility: "easy",
  deferLoading: true,
  searchKeywords: ["sandbox", "read", "file"],

  parameters: z.object({
    path: z.string().min(1).describe("Absolute file path in the sandbox"),
  }),

  async execute(params, ctx) {
    if (!ctx.services.sandbox) {
      return failure("INVALID_STATE", "No sandbox session available");
    }

    const content = await ctx.services.sandbox.readFile(params.path);
    return success({ content });
  },
});

export const sandboxWriteFileTool = defineTool({
  name: "sandbox_write_file",
  description: `Write content to a file in the sandbox filesystem.

USE THIS WHEN:
- Agent needs to create or overwrite files in the sandbox
- Agent needs to write scripts, configs, or data files

RETURNS: Confirmation of successful write.`,
  category: "action",
  stakes: "medium",
  reversibility: "easy",
  deferLoading: true,
  searchKeywords: ["sandbox", "write", "file", "create"],

  parameters: z.object({
    path: z.string().min(1).describe("Absolute file path in the sandbox"),
    content: z.string().describe("Content to write"),
  }),

  async execute(params, ctx) {
    if (!ctx.services.sandbox) {
      return failure("INVALID_STATE", "No sandbox session available");
    }

    await ctx.services.sandbox.writeFile(params.path, params.content);
    return success({ path: params.path, written: true });
  },
});

export const sandboxListFilesTool = defineTool({
  name: "sandbox_list_files",
  description: `List files and directories in a sandbox path.

USE THIS WHEN:
- Agent needs to explore the sandbox filesystem
- Agent needs to find files after code execution

RETURNS: Array of file entries with path, name, type, and size.`,
  category: "action",
  stakes: "low",
  reversibility: "easy",
  deferLoading: true,
  searchKeywords: ["sandbox", "list", "files", "directory", "ls"],

  parameters: z.object({
    path: z.string().optional().default("/").describe("Directory path to list"),
  }),

  async execute(params, ctx) {
    if (!ctx.services.sandbox) {
      return failure("INVALID_STATE", "No sandbox session available");
    }

    const files = await ctx.services.sandbox.listFiles(params.path);
    return success({ files, count: files.length });
  },
});
