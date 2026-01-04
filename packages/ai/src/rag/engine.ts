import { type ChatMessage, CompletionService } from "../completion";
import type { ProviderId } from "../config";
import { buildContext, getCitationsFromText, rerankChunks } from "./context";
import { shouldWarnAboutGrounding, verifyGrounding } from "./grounding";
import { analyzeQuery, enrichQueryWithContext } from "./query-analyzer";
import type {
  ConversationContext,
  GroundingConfidence,
  GroundingResult,
  QueryAnalysis,
  RAGChunk,
  RAGConfig,
  RAGContext,
  RAGResponse,
  RAGStreamEvent,
  RAGTiming,
  RAGTokenUsage,
  RerankingOptions,
} from "./types";

export interface RAGEngineConfig extends Partial<RAGConfig> {
  providerId?: ProviderId;
  modelId?: string;
  temperature?: number;
  enableGrounding?: boolean;
  rerankingOptions?: Partial<RerankingOptions>;
}

const DEFAULT_ENGINE_CONFIG: Required<
  Pick<RAGEngineConfig, "enableGrounding" | "temperature">
> = {
  enableGrounding: true,
  temperature: 0.3,
};

interface RAGEngineRequest {
  query: string;
  chunks: RAGChunk[];
  conversationContext?: ConversationContext;
}

function createEmptyTiming(): RAGTiming {
  return {
    analysisMs: 0,
    retrievalMs: 0,
    rerankingMs: 0,
    generationMs: 0,
    groundingMs: 0,
    totalMs: 0,
    firstTokenMs: null,
  };
}

function computeConfidenceFromGrounding(
  grounding: GroundingResult | null
): GroundingConfidence {
  if (!grounding) {
    return "high";
  }
  return grounding.confidence;
}

export class RAGEngine {
  private readonly completionService: CompletionService;
  private readonly config: RAGEngineConfig;

  constructor(config: RAGEngineConfig = {}) {
    this.config = { ...DEFAULT_ENGINE_CONFIG, ...config };
    this.completionService = new CompletionService({
      providerId: config.providerId,
      modelId: config.modelId,
    });
  }

  async answer(request: RAGEngineRequest): Promise<RAGResponse> {
    const startTime = performance.now();
    const timing = createEmptyTiming();

    const analysisStart = performance.now();
    const analysis = analyzeQuery(request.query, request.conversationContext);
    const enrichedQuery = request.conversationContext
      ? enrichQueryWithContext(analysis, request.conversationContext)
      : analysis.normalizedQuery;
    timing.analysisMs = performance.now() - analysisStart;

    const rerankStart = performance.now();
    const rerankedChunks = rerankChunks(
      enrichedQuery,
      request.chunks,
      this.config.rerankingOptions
    );
    timing.rerankingMs = performance.now() - rerankStart;

    const context = buildContext(
      rerankedChunks,
      analysis,
      this.config,
      request.conversationContext
    );

    const generationStart = performance.now();
    const { answer, usage } = await this.generateAnswer(request.query, context);
    timing.generationMs = performance.now() - generationStart;

    const grounding = this.processGrounding(answer, rerankedChunks, timing);
    const citations = getCitationsFromText(answer, context.citationMap);

    timing.totalMs = performance.now() - startTime;

    return {
      answer,
      citations,
      grounding,
      usage,
      timing,
      confidence: computeConfidenceFromGrounding(grounding),
      followUpQuestions: this.generateFollowUpSuggestions(analysis),
    };
  }

  // biome-ignore lint/suspicious/useAwait: yield* from async generator requires async function
  async *stream(request: RAGEngineRequest): AsyncGenerator<RAGStreamEvent> {
    const startTime = performance.now();
    const timing = createEmptyTiming();

    const { analysis, enrichedQuery } = this.analyzeRequest(request, timing);
    yield { type: "analysis", analysis };

    const rerankedChunks = this.rerankRequest(
      enrichedQuery,
      request.chunks,
      timing
    );
    yield { type: "retrieval" };

    const context = buildContext(
      rerankedChunks,
      analysis,
      this.config,
      request.conversationContext
    );
    yield { type: "context" };

    const streamResult = yield* this.streamGeneration(
      request.query,
      context,
      startTime,
      timing
    );

    for (const citation of context.citationMap.values()) {
      yield { type: "citation", citation };
    }

    if (this.config.enableGrounding) {
      const grounding = this.processGrounding(
        streamResult.answer,
        rerankedChunks,
        timing
      );
      if (grounding && shouldWarnAboutGrounding(grounding)) {
        yield { type: "grounding", grounding };
      }
    }

    timing.totalMs = performance.now() - startTime;
    yield { type: "done", usage: streamResult.usage };
  }

  private analyzeRequest(
    request: RAGEngineRequest,
    timing: RAGTiming
  ): { analysis: QueryAnalysis; enrichedQuery: string } {
    const analysisStart = performance.now();
    const analysis = analyzeQuery(request.query, request.conversationContext);
    const enrichedQuery = request.conversationContext
      ? enrichQueryWithContext(analysis, request.conversationContext)
      : analysis.normalizedQuery;
    timing.analysisMs = performance.now() - analysisStart;
    return { analysis, enrichedQuery };
  }

  private rerankRequest(
    enrichedQuery: string,
    chunks: RAGChunk[],
    timing: RAGTiming
  ): RAGChunk[] {
    const rerankStart = performance.now();
    const rerankedChunks = rerankChunks(
      enrichedQuery,
      chunks,
      this.config.rerankingOptions
    );
    timing.rerankingMs = performance.now() - rerankStart;
    return rerankedChunks;
  }

  private async *streamGeneration(
    query: string,
    context: RAGContext,
    startTime: number,
    timing: RAGTiming
  ): AsyncGenerator<RAGStreamEvent, { answer: string; usage: RAGTokenUsage }> {
    const generationStart = performance.now();
    let answer = "";
    let firstTokenMs: number | null = null;
    let usage: RAGTokenUsage = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    };

    const messages = this.buildMessages(query, context);

    for await (const chunk of this.completionService.stream(messages, {
      systemPrompt: context.systemPrompt,
      temperature: this.config.temperature,
    })) {
      if (chunk.type === "text" && chunk.content) {
        if (firstTokenMs === null) {
          firstTokenMs = performance.now() - startTime;
        }
        answer += chunk.content;
        yield { type: "text", content: chunk.content };
      }

      if (chunk.type === "done" && chunk.usage) {
        usage = {
          promptTokens: chunk.usage.inputTokens ?? 0,
          completionTokens: chunk.usage.outputTokens ?? 0,
          totalTokens:
            (chunk.usage.inputTokens ?? 0) + (chunk.usage.outputTokens ?? 0),
        };
      }
    }

    timing.generationMs = performance.now() - generationStart;
    timing.firstTokenMs = firstTokenMs;

    return { answer, usage };
  }

  private async generateAnswer(
    query: string,
    context: RAGContext
  ): Promise<{ answer: string; usage: RAGTokenUsage }> {
    const messages = this.buildMessages(query, context);

    let answer = "";
    let usage: RAGTokenUsage = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    };

    for await (const chunk of this.completionService.stream(messages, {
      systemPrompt: context.systemPrompt,
      temperature: this.config.temperature,
    })) {
      if (chunk.type === "text" && chunk.content) {
        answer += chunk.content;
      }
      if (chunk.type === "done" && chunk.usage) {
        usage = {
          promptTokens: chunk.usage.inputTokens ?? 0,
          completionTokens: chunk.usage.outputTokens ?? 0,
          totalTokens:
            (chunk.usage.inputTokens ?? 0) + (chunk.usage.outputTokens ?? 0),
        };
      }
    }

    return { answer, usage };
  }

  private buildMessages(query: string, context: RAGContext): ChatMessage[] {
    return [
      {
        role: "user",
        content: `Context:\n${context.contextText}\n\nQuestion: ${query}`,
      },
    ];
  }

  private processGrounding(
    answer: string,
    chunks: RAGChunk[],
    timing: RAGTiming
  ): GroundingResult | null {
    if (!this.config.enableGrounding) {
      return null;
    }

    const groundingStart = performance.now();
    const grounding = verifyGrounding(
      answer,
      chunks,
      this.config.groundingThreshold
    );
    timing.groundingMs = performance.now() - groundingStart;

    return grounding;
  }

  private generateFollowUpSuggestions(analysis: QueryAnalysis): string[] {
    const suggestions: string[] = [];

    if (analysis.entities.length > 0) {
      const entity = analysis.entities[0];
      if (entity) {
        suggestions.push(`Tell me more about ${entity.text}`);
      }
    }

    switch (analysis.intent) {
      case "definition":
        suggestions.push("Can you give me some examples?");
        break;
      case "howto":
        suggestions.push("What are common mistakes to avoid?");
        break;
      case "comparison":
        suggestions.push("Which one would you recommend and why?");
        break;
      case "question":
        suggestions.push("Can you elaborate on that?");
        break;
      default:
        break;
    }

    if (analysis.temporalContext) {
      suggestions.push("What about more recent information?");
    }

    return suggestions.slice(0, 3);
  }

  withConfig(config: Partial<RAGEngineConfig>): RAGEngine {
    return new RAGEngine({ ...this.config, ...config });
  }
}

export const ragEngine = new RAGEngine();

export function answerWithRAG(
  query: string,
  chunks: RAGChunk[],
  config?: RAGEngineConfig
): Promise<RAGResponse> {
  const engine = config ? new RAGEngine(config) : ragEngine;
  return engine.answer({ query, chunks });
}

export function streamRAGAnswer(
  query: string,
  chunks: RAGChunk[],
  config?: RAGEngineConfig
): AsyncGenerator<RAGStreamEvent> {
  const engine = config ? new RAGEngine(config) : ragEngine;
  return engine.stream({ query, chunks });
}
