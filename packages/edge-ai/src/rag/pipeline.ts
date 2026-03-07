import type { EdgeSearchEngine } from "@openbeam/edge-search";
import type {
  EdgeEmbeddingModel,
  EdgeRAGResponse,
  EdgeSLM,
} from "@openbeam/types/edge/ai";
import type { EdgeSearchQuery } from "@openbeam/types/edge/search";
import { EDGE_RAG_PROMPT, formatPrompt } from "../prompts/templates";

type EdgeRAGPipelineConfig = {
  slm: EdgeSLM;
  embedding: EdgeEmbeddingModel;
  searchEngine: EdgeSearchEngine;
  maxContextDocuments?: number;
  maxContextTokens?: number;
};

export class EdgeRAGPipeline {
  private readonly slm: EdgeSLM;
  private readonly embedding: EdgeEmbeddingModel;
  private readonly searchEngine: EdgeSearchEngine;
  private readonly maxContextDocuments: number;

  constructor(config: EdgeRAGPipelineConfig) {
    this.slm = config.slm;
    this.embedding = config.embedding;
    this.searchEngine = config.searchEngine;
    this.maxContextDocuments = config.maxContextDocuments ?? 5;
  }

  async query(userQuery: string): Promise<EdgeRAGResponse> {
    const start = performance.now();

    const queryVector = await this.embedding.embed(userQuery);

    const searchStart = performance.now();
    const searchQuery: EdgeSearchQuery = {
      query: userQuery,
      limit: this.maxContextDocuments,
    };
    const searchResults = await this.searchEngine.search(
      searchQuery,
      queryVector
    );
    const searchLatencyMs = performance.now() - searchStart;

    const context = assembleContext(searchResults.results);

    const genStart = performance.now();
    const prompt = formatPrompt(EDGE_RAG_PROMPT, {
      context,
      query: userQuery,
    });
    const response = await this.slm.generate(prompt);
    const generationLatencyMs = performance.now() - genStart;

    return {
      answer: response.text,
      sources: searchResults.results.map((r) => ({
        documentId: r.documentId,
        title: r.title,
        snippet: r.snippet,
        score: r.score,
      })),
      tokensUsed: response.tokensUsed,
      latencyMs: performance.now() - start,
      searchLatencyMs,
      generationLatencyMs,
    };
  }
}

function assembleContext(
  results: Array<{ title: string; snippet: string }>
): string {
  return results
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}`)
    .join("\n\n");
}
