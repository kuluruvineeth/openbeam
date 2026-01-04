import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const docChunksTool = defineTool({
  name: "doc_chunks",
  description: `Retrieve specific chunks from a document.
Use when you need precise sections rather than the full document.
Returns chunks with their text, embeddings info, and position.`,
  category: "documents",
  deferLoading: false,
  searchKeywords: ["chunks", "sections", "parts", "segments", "extract"],

  parameters: z.object({
    documentId: z.string().describe("The document ID"),
    chunkIndices: z
      .array(z.number())
      .optional()
      .describe("Specific chunk indices to retrieve"),
    startIndex: z.number().optional().describe("Start index for range"),
    endIndex: z.number().optional().describe("End index for range"),
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

    const allChunks = await ctx.services.documents.getChunks(params.documentId);

    let filteredChunks = allChunks;

    if (params.chunkIndices) {
      const indices = new Set(params.chunkIndices);
      filteredChunks = allChunks.filter((c) => indices.has(c.position));
    } else if (
      params.startIndex !== undefined ||
      params.endIndex !== undefined
    ) {
      const start = params.startIndex ?? 0;
      const end = params.endIndex ?? allChunks.length;
      filteredChunks = allChunks.filter(
        (c) => c.position >= start && c.position < end
      );
    }

    return success(
      {
        documentId: params.documentId,
        documentTitle: doc.title,
        chunks: filteredChunks.map((c) => ({
          index: c.position,
          content: c.content,
          tokenCount: c.tokenCount,
        })),
        totalChunks: allChunks.length,
        retrievedChunks: filteredChunks.length,
      },
      {
        latencyMs: performance.now() - startTime,
        source: "vespa",
      }
    );
  },
});
