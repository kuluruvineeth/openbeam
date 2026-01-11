import { getSearchCache } from "@openplane/redis";
import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

type SearchResultItem = {
  id: string;
  relevanceScore: number;
};

type SearchResultForCache = {
  items: SearchResultItem[];
  total: number;
};

async function cacheSearchResult(
  teamId: string,
  query: string,
  result: SearchResultForCache
): Promise<void> {
  if (result.items.length === 0) {
    return;
  }

  try {
    const searchCache = getSearchCache();
    await searchCache.set(teamId, query, {
      documentIds: result.items.map((item) => item.id),
      scores: Object.fromEntries(
        result.items.map((item) => [item.id, item.relevanceScore])
      ),
      totalCount: result.total,
      cachedAt: Date.now(),
    });
  } catch {
    // Ignore cache write errors
  }
}

export const overviewSearchTool = defineTool({
  name: "overview_search",
  description: `Search across all connected enterprise data sources including documents and media for AI overview generation.

USE THIS WHEN:
- Generating comprehensive AI overviews that require grounded answers
- User asks questions requiring synthesis from multiple document sources
- Research tasks needing both document and media content

RETURNS: Ranked list of documents and media with relevance scores, content snippets, and source metadata. Results are filtered by team access controls and used to generate grounded, cited answers.`,
  category: "rag",
  deferLoading: false,
  searchKeywords: ["overview", "search", "documents", "media", "grounded"],

  parameters: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "The search query to find relevant documents and media for the overview"
      ),
    limit: z
      .number()
      .min(1)
      .max(50)
      .optional()
      .default(10)
      .describe("Maximum number of results to return (1-50)"),
    includeDocuments: z
      .boolean()
      .optional()
      .default(true)
      .describe("Include documents in search results"),
    includeMedia: z
      .boolean()
      .optional()
      .default(true)
      .describe("Include media (videos, etc.) in search results"),
    connectorTypes: z
      .array(z.string())
      .optional()
      .describe("Filter by specific connector types"),
  }),

  async execute(params, ctx) {
    if (!ctx.teamId) {
      return failure(
        "UNAUTHORIZED",
        "Team context required for overview search"
      );
    }

    const startTime = performance.now();

    const result = await ctx.services.search.unified({
      query: params.query,
      teamId: ctx.teamId,
      limit: params.limit,
      accessControlIds: ctx.accessControl,
      connectorTypes: params.connectorTypes,
      includeDocuments: params.includeDocuments,
      includeMedia: params.includeMedia,
    });

    cacheSearchResult(ctx.teamId, params.query, result);

    const sources = result.items.map((item, index) => ({
      index: index + 1,
      id: item.id,
      title: item.title,
      type: item.type,
      connectorType: item.connectorType ?? "unknown",
      snippet: item.content?.slice(0, 500),
      url: item.url,
      relevanceScore: item.relevanceScore,
    }));

    return success(
      {
        success: true,
        documentCount: result.items.length,
        totalAvailable: result.total,
        sources,
        contextForCitations: result.items.map((item, index) => ({
          index: index + 1,
          id: item.id,
          title: item.title,
          content: item.content,
          url: item.url,
          type: item.type,
          connectorType: item.connectorType,
          relevanceScore: item.relevanceScore,
        })),
      },
      {
        latencyMs: performance.now() - startTime,
        source: "vespa",
      }
    );
  },
});
