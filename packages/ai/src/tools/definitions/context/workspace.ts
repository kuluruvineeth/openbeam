import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

interface WorkspaceWriteResult {
  fileId: string;
  name: string;
  preview: string;
  tokenCount: number;
}

interface WorkspaceDeleteResult {
  fileId: string;
  deleted: boolean;
}

export const workspaceWriteTool = defineTool({
  name: "workspace_write",
  description: `Store content in a virtual workspace file for later retrieval.
Use this to save intermediate results, generated content, or artifacts.
Virtual files persist for the duration of the session and can be read back using virtual_file_read.
Returns a file ID that can be used for retrieval.`,
  category: "data",
  deferLoading: false,
  searchKeywords: [
    "workspace",
    "write",
    "save",
    "store",
    "create",
    "file",
    "artifact",
  ],
  allowedCallers: ["agent", "mcp"],

  parameters: z.object({
    name: z.string().describe("A descriptive name for the file content"),
    content: z.string().describe("The content to store in the workspace"),
    mimeType: z
      .string()
      .optional()
      .describe(
        "Optional MIME type (e.g., 'application/json', 'text/markdown')"
      ),
  }),

  execute(params, ctx) {
    const startTime = performance.now();

    if (!params.content) {
      return Promise.resolve(
        failure("INVALID_INPUT", "Content cannot be empty")
      );
    }

    const fileInfo = ctx.services.context.storeVirtualFile(
      params.name,
      params.content,
      params.mimeType
    );

    const result: WorkspaceWriteResult = {
      fileId: fileInfo.fileId,
      name: fileInfo.name,
      preview: fileInfo.preview,
      tokenCount: fileInfo.tokenCount,
    };

    return Promise.resolve(
      success(result, { latencyMs: performance.now() - startTime })
    );
  },
});

export const workspaceDeleteTool = defineTool({
  name: "workspace_delete",
  description: `Delete a virtual file from the workspace.
Use this to clean up files that are no longer needed.
Frees memory and reduces context usage.`,
  category: "data",
  deferLoading: false,
  searchKeywords: ["workspace", "delete", "remove", "file", "cleanup"],
  allowedCallers: ["agent", "mcp"],

  parameters: z.object({
    fileId: z
      .string()
      .describe("Virtual file ID to delete (e.g., vf_1_1704067200000)"),
  }),

  execute(params, ctx) {
    const startTime = performance.now();

    const deleted = ctx.services.context.deleteVirtualFile(params.fileId);

    if (!deleted) {
      return Promise.resolve(
        failure(
          "NOT_FOUND",
          `Virtual file ${params.fileId} not found or already deleted`
        )
      );
    }

    const result: WorkspaceDeleteResult = {
      fileId: params.fileId,
      deleted: true,
    };

    return Promise.resolve(
      success(result, { latencyMs: performance.now() - startTime })
    );
  },
});
