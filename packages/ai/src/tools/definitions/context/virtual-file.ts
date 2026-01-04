import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

interface VirtualFileReadResult {
  fileId: string;
  content: string;
  isChunk: boolean;
  range?: { start: number; end: number };
  length: number;
}

export const virtualFileReadTool = defineTool({
  name: "virtual_file_read",
  description: `Read content from a virtual file stored in context.
Use when you see [Virtual File: vf_xxx] in the context.
Virtual files contain large tool outputs that were externalized to save context space.
You can read the full content or a specific chunk by character range.`,
  category: "documents",
  deferLoading: false,
  searchKeywords: ["virtual", "file", "read", "vf_", "context", "retrieve"],

  parameters: z.object({
    fileId: z.string().describe("Virtual file ID (e.g., vf_1_1704067200000)"),
    start: z
      .number()
      .optional()
      .describe("Start character position for chunk retrieval"),
    end: z
      .number()
      .optional()
      .describe("End character position for chunk retrieval"),
  }),

  execute(params, ctx) {
    const startTime = performance.now();

    if (params.start !== undefined && params.end !== undefined) {
      const chunk = ctx.services.context.retrieveVirtualFileChunk(
        params.fileId,
        params.start,
        params.end
      );

      if (!chunk) {
        return Promise.resolve(
          failure(
            "NOT_FOUND",
            `Virtual file ${params.fileId} not found or expired`
          )
        );
      }

      const result: VirtualFileReadResult = {
        fileId: params.fileId,
        content: chunk,
        isChunk: true,
        range: { start: params.start, end: params.end },
        length: chunk.length,
      };
      return Promise.resolve(
        success(result, { latencyMs: performance.now() - startTime })
      );
    }

    const content = ctx.services.context.retrieveVirtualFile(params.fileId);

    if (!content) {
      return Promise.resolve(
        failure(
          "NOT_FOUND",
          `Virtual file ${params.fileId} not found or expired`
        )
      );
    }

    const result: VirtualFileReadResult = {
      fileId: params.fileId,
      content,
      isChunk: false,
      length: content.length,
    };
    return Promise.resolve(
      success(result, { latencyMs: performance.now() - startTime })
    );
  },
});

export const virtualFileListTool = defineTool({
  name: "virtual_file_list",
  description: `List all virtual files currently available in context.
Returns file IDs, names, previews, and token counts.
Use to discover what large outputs have been externalized.`,
  category: "documents",
  deferLoading: false,
  searchKeywords: ["virtual", "file", "list", "available", "context"],

  parameters: z.object({}),

  execute(_params, ctx) {
    const startTime = performance.now();

    const files = ctx.services.context.listVirtualFiles();

    return Promise.resolve(
      success(
        {
          files,
          count: files.length,
          totalTokens: files.reduce((sum, f) => sum + f.tokenCount, 0),
        },
        { latencyMs: performance.now() - startTime }
      )
    );
  },
});
