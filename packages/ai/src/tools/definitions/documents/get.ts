import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const docGetTool = defineTool({
  name: "doc_get",
  description: `Retrieve a specific document by ID with full content.
Returns document metadata, content, and chunks if available.
Use when you need to read the complete content of a known document.`,
  category: "documents",
  deferLoading: false,
  searchKeywords: ["document", "get", "retrieve", "fetch", "read"],

  parameters: z.object({
    documentId: z.string().describe("The document ID to retrieve"),
    includeChunks: z
      .boolean()
      .optional()
      .default(false)
      .describe("Include individual chunks"),
    maxContentLength: z
      .number()
      .optional()
      .describe("Truncate content to this length"),
  }),

  async execute(params, ctx) {
    const startTime = performance.now();

    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }

    const doc = await ctx.services.documents.get(params.documentId);

    if (!doc) {
      return failure("NOT_FOUND", `Document not found: ${params.documentId}`);
    }

    if (doc.teamId !== ctx.teamId) {
      return failure("UNAUTHORIZED", "Document belongs to different team");
    }

    let content = doc.content || "";
    if (params.maxContentLength && content.length > params.maxContentLength) {
      content = `${content.slice(0, params.maxContentLength)}...`;
    }

    const chunks = params.includeChunks
      ? (await ctx.services.documents.getChunks(params.documentId)).map(
          (c) => ({
            index: c.position,
            content: c.content,
            tokenCount: c.tokenCount,
          })
        )
      : undefined;

    return success(
      {
        document: {
          id: doc.id,
          title: doc.title,
          content,
          url: doc.url,
          connectorType: doc.connectorType,
          documentType: doc.documentType,
          author: doc.authorName,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
          sourceName: doc.sourceName,
        },
        found: true,
        chunks,
      },
      {
        latencyMs: performance.now() - startTime,
        source: "vespa",
      }
    );
  },
});
