import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import {
  type RankedSearchParams,
  rankedSearch,
  type SearchFilters,
  type SearchHit,
} from "@openbeam/vespa";

interface Citation {
  title: string;
  url: string;
  snippet: string;
  score: number;
}

interface AskQuestionResult {
  answer: string;
  citations: Citation[];
  confidence: "high" | "medium" | "low";
  sources_used: number;
}

function buildCitationFromHit(hit: SearchHit): Citation {
  const doc = hit.document;
  return {
    title: doc.title || "Untitled",
    url: doc.url ?? "",
    snippet: (doc.content ?? "").slice(0, 300) || doc.title,
    score: hit.relevance ?? 0,
  };
}

function synthesizeAnswer(citations: Citation[]): AskQuestionResult {
  if (citations.length === 0) {
    return {
      answer:
        "No relevant documents found. Try rephrasing your question or broadening the search scope.",
      citations: [],
      confidence: "low",
      sources_used: 0,
    };
  }

  const topScore = citations[0]?.score ?? 0;
  let confidence: "high" | "medium" | "low" = "low";
  if (topScore > 0.8) {
    confidence = "high";
  } else if (topScore > 0.5) {
    confidence = "medium";
  }

  const contextParts = citations.map(
    (c, i) => `[${i + 1}] ${c.title}: ${c.snippet}`
  );

  const answer = `Based on ${citations.length} source(s):\n\n${contextParts.join("\n\n")}\n\nRelevant sources are cited above. For a synthesized AI answer, ensure the RAG engine is configured with an LLM provider.`;

  return {
    answer,
    citations,
    confidence,
    sources_used: citations.length,
  };
}

export const qaTools: Tool[] = [
  {
    name: "ask_question",
    description:
      "Ask a question and get an answer synthesized from enterprise documents. Searches across all connected data sources and returns a structured answer with citations.",
    inputSchema: {
      type: "object",
      properties: {
        question: {
          type: "string",
          description: "The question to answer",
        },
        context: {
          type: "string",
          description:
            "Optional additional context to refine the search and answer",
        },
        connector_types: {
          type: "array",
          items: { type: "string" },
          description:
            "Filter by connector types (e.g., 'slack', 'notion', 'google-drive')",
        },
        max_sources: {
          type: "number",
          description: "Maximum number of source documents to use (1-20)",
          default: 5,
        },
      },
      required: ["question"],
    },
  },
];

export async function handleQaTool(
  teamId: string,
  name: string,
  args: Record<string, unknown> | undefined
): Promise<{
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}> {
  try {
    switch (name) {
      case "ask_question": {
        const question = args?.question as string;
        const context = args?.context as string | undefined;
        const connectorTypes = args?.connector_types as string[] | undefined;
        const maxSources = Math.min(
          Math.max((args?.max_sources as number) ?? 5, 1),
          20
        );

        const searchQuery = context ? `${question} ${context}` : question;

        const filters: SearchFilters = {};
        if (connectorTypes?.length) {
          filters.connectorTypes = connectorTypes;
        }

        const searchParams: RankedSearchParams = {
          query: searchQuery,
          teamId,
          rankingProfile: "hybrid",
          limit: maxSources,
          filters,
        };

        const searchResult = await rankedSearch(searchParams);

        const citations = searchResult.hits.map(buildCitationFromHit);
        const result = synthesizeAnswer(citations);

        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown QA tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${message}` }],
      isError: true,
    };
  }
}
