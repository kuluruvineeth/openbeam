import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const searchSimilarTool = defineTool({
  name: "search_similar",
  description: `Find documents similar to a given document.
Use when you have a document and want to find related content.
Best for: finding related documents, content recommendations, duplicate detection.`,
  category: "search",
  deferLoading: false,
  searchKeywords: ["similar", "related", "like", "duplicate", "recommendation"],

  parameters: z.object({
    documentId: z.string().describe("ID of the source document"),
    limit: z.number().min(1).max(50).optional().default(5),
    excludeSameConnector: z
      .boolean()
      .optional()
      .default(false)
      .describe("Exclude documents from the same connector"),
  }),

  async execute(params, ctx) {
    const startTime = performance.now();

    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required for search");
    }

    const sourceDoc = await ctx.services.documents.get(params.documentId);

    if (!sourceDoc) {
      return failure(
        "NOT_FOUND",
        `Source document not found: ${params.documentId}`
      );
    }

    if (sourceDoc.teamId !== ctx.teamId) {
      return failure("UNAUTHORIZED", "Document belongs to different team");
    }

    const searchQuery = `${sourceDoc.title} ${sourceDoc.content?.slice(0, 500) || ""}`;

    let connectorTypesFilter: string[] | undefined;
    if (!params.excludeSameConnector && sourceDoc.connectorType) {
      connectorTypesFilter = [sourceDoc.connectorType];
    }

    const result = await ctx.services.search.semantic({
      query: searchQuery,
      teamId: ctx.teamId,
      limit: params.limit + 1,
      accessControlIds: ctx.accessControl,
      connectorTypes: connectorTypesFilter,
    });

    const similarDocs = result.documents
      .filter((doc) => doc.id !== params.documentId)
      .slice(0, params.limit)
      .map((doc) => ({
        id: doc.id,
        title: doc.title,
        snippet: doc.content?.slice(0, 200),
        similarity: doc.relevanceScore,
        connectorType: doc.connectorType,
        url: doc.url,
      }));

    return success(
      {
        results: similarDocs,
        sourceDocument: {
          id: sourceDoc.id,
          title: sourceDoc.title,
          connectorType: sourceDoc.connectorType,
        },
      },
      {
        latencyMs: performance.now() - startTime,
        source: "vespa",
      }
    );
  },
});
