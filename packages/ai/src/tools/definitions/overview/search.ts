import { getSearchCache } from "@openplane/redis";
import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

type FlatUnifiedSearchItem = {
  id: string;
  type: "document" | "media";
  title: string;
  content?: string;
  url?: string;
  connectorType?: string;
  relevanceScore: number;
};

type RawUnifiedSearchItem = {
  type: "document" | "media";
  data: Record<string, unknown>;
  relevance: number;
};

type UnifiedSearchItemLike = FlatUnifiedSearchItem | RawUnifiedSearchItem;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getOptionalString(
  record: Record<string, unknown>,
  key: string
): string | undefined {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}

function extractUnifiedItem(
  item: UnifiedSearchItemLike
): FlatUnifiedSearchItem {
  if ("id" in item) {
    return item;
  }

  const id = getOptionalString(item.data, "id") ?? "";
  const title = getOptionalString(item.data, "title") ?? "";
  const url = getOptionalString(item.data, "url");
  const connectorType =
    getOptionalString(item.data, "connectorType") ??
    getOptionalString(item.data, "connector_type");

  const content =
    getOptionalString(item.data, "content") ??
    ([
      getOptionalString(item.data, "description"),
      getOptionalString(item.data, "media_summary"),
      getOptionalString(item.data, "transcript"),
    ]
      .filter((v): v is string => typeof v === "string" && v.length > 0)
      .join("\n\n") ||
      undefined);

  return {
    id,
    type: item.type,
    title,
    content,
    url,
    connectorType,
    relevanceScore: item.relevance,
  };
}

async function cacheSearchResult(
  teamId: string,
  query: string,
  result: { items: unknown[]; total: number }
): Promise<void> {
  if (result.items.length === 0) {
    return;
  }

  try {
    const items: FlatUnifiedSearchItem[] = result.items
      .filter((item): item is UnifiedSearchItemLike => isRecord(item))
      .map((item) => extractUnifiedItem(item));

    const documentItems = items.filter(
      (item) =>
        item.type === "document" &&
        typeof item.id === "string" &&
        item.id.length > 0 &&
        typeof item.relevanceScore === "number"
    );

    if (documentItems.length === 0) {
      return;
    }

    const searchCache = getSearchCache();
    await searchCache.set(teamId, query, {
      documentIds: documentItems.map((item) => item.id),
      scores: Object.fromEntries(
        documentItems.map((item) => [item.id, item.relevanceScore])
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

    await cacheSearchResult(ctx.teamId, params.query, result);

    const extractedItems = (result.items as unknown[])
      .filter((item): item is UnifiedSearchItemLike => isRecord(item))
      .map((item) => extractUnifiedItem(item));

    const sources = extractedItems.map((item, index) => ({
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
        documentCount: sources.length,
        totalAvailable: result.total,
        sources,
        contextForCitations: extractedItems.map((item, index) => ({
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
