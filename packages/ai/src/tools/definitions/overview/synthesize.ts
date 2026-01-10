import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

const SearchResultSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string().optional(),
  url: z.string().optional(),
  type: z.enum(["document", "media"]),
  connectorType: z.string().optional(),
  relevanceScore: z.number(),
});

export type SearchResult = z.infer<typeof SearchResultSchema>;

export interface SynthesizedCitation {
  index: number;
  documentId: string;
  title: string;
  url?: string;
  snippet: string;
  connectorType?: string;
  sourceType: "document" | "media";
  relevanceScore: number;
}

export interface SynthesisContext {
  query: string;
  citations: SynthesizedCitation[];
  groundingScore: number;
  sourceCount: number;
  formattedContext: string;
}

export const overviewSynthesizeTool = defineTool({
  name: "overview_synthesize",
  description: `Prepare search results for synthesis into a grounded answer.

USE THIS WHEN:
- Have gathered search results from multiple queries
- Need to prepare context with citations for answer generation
- Building the context for an AI overview response

RETURNS: Prepared context with citations and formatted source content for LLM answer generation.`,
  category: "rag",
  deferLoading: false,
  searchKeywords: ["synthesize", "citations", "context", "grounded"],

  parameters: z.object({
    query: z.string().min(1).describe("The original user query"),
    searchResults: z
      .array(SearchResultSchema)
      .min(1)
      .describe("Combined search results from all sub-queries"),
    maxSources: z
      .number()
      .min(1)
      .max(20)
      .optional()
      .default(8)
      .describe("Maximum sources to include in synthesis"),
  }),

  execute(params, ctx) {
    if (!ctx.teamId) {
      return Promise.resolve(
        failure("UNAUTHORIZED", "Team context required for synthesis")
      );
    }

    const startTime = performance.now();

    const uniqueResults = deduplicateResults(params.searchResults);
    const topResults = uniqueResults
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, params.maxSources);

    const citations: SynthesizedCitation[] = topResults.map((result, idx) => ({
      index: idx + 1,
      documentId: result.id,
      title: result.title,
      url: result.url,
      snippet: result.content?.slice(0, 300) ?? "",
      connectorType: result.connectorType,
      sourceType: result.type,
      relevanceScore: result.relevanceScore,
    }));

    const groundingScore = calculateGroundingScore(citations);

    const formattedContext = formatContextForLLM(params.query, citations);

    return Promise.resolve(
      success(
        {
          query: params.query,
          citations,
          groundingScore,
          sourceCount: citations.length,
          formattedContext,
        },
        {
          latencyMs: performance.now() - startTime,
          source: "synthesize",
        }
      )
    );
  },
});

function deduplicateResults(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  return results.filter((r) => {
    if (seen.has(r.id)) {
      return false;
    }
    seen.add(r.id);
    return true;
  });
}

function calculateGroundingScore(citations: SynthesizedCitation[]): number {
  if (citations.length === 0) {
    return 0;
  }
  const totalScore = citations.reduce((sum, c) => sum + c.relevanceScore, 0);
  return totalScore / citations.length;
}

function formatContextForLLM(
  query: string,
  citations: SynthesizedCitation[]
): string {
  const sourceBlocks = citations
    .map(
      (c) =>
        `[${c.index}] ${c.title}${c.connectorType ? ` (${c.connectorType})` : ""}\n${c.snippet}`
    )
    .join("\n\n");

  return `QUERY: ${query}

SOURCES:
${sourceBlocks}

Generate a comprehensive answer using the sources above. Reference sources using [1], [2], etc.`;
}
