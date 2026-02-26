import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const searchHybridTool = defineTool({
  name: "search_hybrid",
  description: `Search across all connected enterprise data sources using hybrid semantic + keyword search.

USE THIS WHEN:
- User asks a general question requiring information from the knowledge base
- Query contains specific keywords, names, or exact phrases
- User wants to find documents, people, projects, or entities
- Research tasks requiring comprehensive results across all sources

DO NOT USE WHEN:
- User wants conceptually similar documents without keywords (use search_semantic)
- User already has a document and wants related content (use search_similar)
- Query is purely about meaning without specific terms (use search_semantic)
- User needs to read a specific known document (use doc_get)

RETURNS: Ranked list of documents with relevance scores, snippets, and source metadata. Results are filtered by team access controls.`,
  category: "search",
  deferLoading: false,
  searchKeywords: ["find", "search", "query", "lookup", "discover"],
  pricing: { amount: "0.01", description: "Per search query" },

  parameters: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "The search query. Supports natural language questions, keyword searches, and exact phrases in quotes. Examples: 'Q3 revenue report', 'John Smith onboarding', '\"API documentation\"'"
      ),
    limit: z
      .number()
      .min(1)
      .max(100)
      .optional()
      .default(10)
      .describe(
        "Maximum number of results to return (1-100). Use lower values (5-10) for focused queries, higher (20-50) for comprehensive research."
      ),
    filters: z
      .object({
        connectorTypes: z
          .array(z.string())
          .optional()
          .describe(
            "Limit search to specific connectors. Valid values: 'linear', 'slack', 'notion', 'jira', 'github', 'google-drive', 'confluence'. Omit to search all."
          ),
        dateRange: z
          .object({
            start: z
              .string()
              .optional()
              .describe("ISO 8601 date string. Example: '2024-01-01'"),
            end: z
              .string()
              .optional()
              .describe("ISO 8601 date string. Example: '2024-12-31'"),
          })
          .optional()
          .describe(
            "Filter by document modification date. Useful for recent content or historical research."
          ),
        authors: z
          .array(z.string())
          .optional()
          .describe(
            "Filter by author name or email. Partial matching supported."
          ),
      })
      .optional()
      .describe("Optional filters to narrow search scope."),
  }),

  async execute(params, ctx) {
    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required for search");
    }

    const prefs = ctx.memory?.preferences;
    const connectorTypes =
      params.filters?.connectorTypes ?? prefs?.searchDefaults?.connectorTypes;

    const preferredSources = prefs?.preferredSources ?? [];
    const excludedSources = prefs?.excludedSources ?? [];

    let filteredConnectorTypes = connectorTypes;
    if (excludedSources.length > 0 && filteredConnectorTypes) {
      filteredConnectorTypes = filteredConnectorTypes.filter(
        (ct) => !excludedSources.includes(ct)
      );
    }

    const startTime = performance.now();

    const result = await ctx.services.search.hybrid({
      query: params.query,
      teamId: ctx.teamId,
      limit: params.limit,
      connectorTypes: filteredConnectorTypes,
      accessControlIds: ctx.accessControl,
    });

    const latencyMs = performance.now() - startTime;

    ctx.memory?.signalSearch(params.query, result.total, latencyMs);

    let documents = result.documents;
    if (preferredSources.length > 0) {
      documents = [...documents].sort((a, b) => {
        const aPreferred = preferredSources.includes(a.connectorType ?? "");
        const bPreferred = preferredSources.includes(b.connectorType ?? "");
        if (aPreferred && !bPreferred) {
          return -1;
        }
        if (!aPreferred && bPreferred) {
          return 1;
        }
        return b.relevanceScore - a.relevanceScore;
      });
    }

    return success(
      {
        results: documents.map((doc) => ({
          id: doc.id,
          title: doc.title,
          snippet: doc.content?.slice(0, 300),
          score: doc.relevanceScore,
          source: doc.connectorType,
          url: doc.url,
          documentType: doc.documentType,
          updatedAt: doc.updatedAt,
        })),
        totalCount: result.total,
        query: params.query,
        personalized: preferredSources.length > 0 || excludedSources.length > 0,
      },
      {
        latencyMs: result.queryTime,
        source: "vespa",
        tokenCount: result.embeddingTime ? 1 : undefined,
      }
    );
  },
});
