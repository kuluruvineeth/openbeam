import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const searchSimilarTool = defineTool({
  name: "search_similar",
  description: `Find documents similar to a given document based on content and semantic similarity.

USE THIS WHEN:
- User has a specific document and wants to find related content
- "Find documents like this one" or "Show me similar to X"
- Building a recommendation system for related reading
- Detecting duplicate or near-duplicate content
- Exploring a topic starting from a known good document

DO NOT USE WHEN:
- User is searching for content by query (use search_hybrid)
- User wants conceptually related documents without a source document (use search_semantic)
- User wants to answer a question (use rag_answer)
- You don't have a document ID (search for it first with search_hybrid)

RETURNS: Documents ranked by similarity to the source document, with similarity scores. Higher scores indicate more related content.`,
  category: "search",
  deferLoading: false,
  searchKeywords: ["similar", "related", "like", "duplicate", "recommendation"],

  parameters: z.object({
    documentId: z
      .string()
      .describe(
        "ID of the source document to find similar content for. Obtain from previous search results or doc_get calls."
      ),
    limit: z
      .number()
      .min(1)
      .max(50)
      .optional()
      .default(5)
      .describe(
        "Maximum similar documents to return (1-50). Use 3-5 for quick recommendations, 10-20 for comprehensive exploration."
      ),
    excludeSameConnector: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        "Exclude documents from the same connector as the source. Enable to find cross-source relationships (e.g., find Slack discussions about a Jira ticket)."
      ),
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
