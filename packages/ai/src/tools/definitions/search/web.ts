import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

const WEB_SEARCH_CACHE_TTL_MS = 300_000;
const WEB_SEARCH_MAX_CONTENT_LENGTH = 10_000;

const ExaResultSchema = z.object({
  title: z.string().optional().default(""),
  url: z.string(),
  text: z.string().optional().default(""),
  publishedDate: z.string().optional(),
  score: z.number().optional().default(0),
});

const ExaResponseSchema = z.object({
  results: z.array(ExaResultSchema),
});

export const searchWebTool = defineTool({
  name: "search_web",
  description: `Search the web for current information using semantic and keyword search. Returns titles, URLs, snippets, and full content from web pages.

USE THIS WHEN:
- User needs current information beyond enterprise data
- Research requires external sources, news, or documentation
- Query relates to public information not in connected sources

DO NOT USE WHEN:
- User asks about internal company data (use search_hybrid)
- User wants to find internal documents (use search_hybrid or doc_get)`,
  category: "search",
  deferLoading: false,
  searchKeywords: ["web", "internet", "external", "research", "news"],

  parameters: z.object({
    query: z.string().min(1).describe("Search query for web research"),
    numResults: z
      .number()
      .min(1)
      .max(30)
      .optional()
      .default(10)
      .describe("Number of results to return (1-30)"),
    type: z
      .enum(["neural", "keyword", "auto"])
      .optional()
      .default("auto")
      .describe(
        "Search type: neural for semantic, keyword for exact, auto for best match"
      ),
    startDate: z
      .string()
      .optional()
      .describe("ISO 8601 date filter for start date"),
    endDate: z
      .string()
      .optional()
      .describe("ISO 8601 date filter for end date"),
    includeDomains: z
      .array(z.string())
      .optional()
      .describe("Only include results from these domains"),
    excludeDomains: z
      .array(z.string())
      .optional()
      .describe("Exclude results from these domains"),
    includeContent: z
      .boolean()
      .optional()
      .default(true)
      .describe("Whether to include full page content"),
  }),

  cacheTtlMs: WEB_SEARCH_CACHE_TTL_MS,

  async execute(params, _ctx) {
    const apiKey = process.env.EXA_API_KEY;
    if (!apiKey) {
      return failure("PROVIDER_ERROR", "Exa API key not configured", {
        retryable: false,
      });
    }

    const startMs = performance.now();

    const { default: Exa } = await import("exa-js");
    const exa = new Exa(apiKey);

    const response = await exa.searchAndContents(params.query, {
      numResults: params.numResults,
      type: params.type,
      startPublishedDate: params.startDate,
      endPublishedDate: params.endDate,
      includeDomains: params.includeDomains,
      excludeDomains: params.excludeDomains,
      text: params.includeContent
        ? { maxCharacters: WEB_SEARCH_MAX_CONTENT_LENGTH }
        : undefined,
    });

    const validated = ExaResponseSchema.parse(response);

    const results = validated.results.map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.text.slice(0, 500),
      content: params.includeContent ? r.text : undefined,
      publishedDate: r.publishedDate,
      score: r.score,
    }));

    const latencyMs = performance.now() - startMs;

    return success(
      { results, totalCount: results.length, query: params.query },
      { latencyMs, source: "exa" }
    );
  },
});
