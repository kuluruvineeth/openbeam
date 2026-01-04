import { type ChatMessage, streamCompletion } from "@openplane/ai";
import type { Database } from "@openplane/db";
import { createRAGInteraction } from "@openplane/db";
import { getRAGCache, hashQuery } from "@openplane/redis";
import type { GenericDocument } from "@openplane/vespa";
import { logger } from "../../lib/logger";
import { searchService } from "../../search/service";
import {
  extractChunksFromDocuments,
  rerankChunks,
  selectDiverse,
} from "./chunk-reranker";
import { assembleContext } from "./context-assembler";
import { getConversationManager } from "./conversation-manager";
import { shouldIncludeGrounding, verifyGrounding } from "./grounding-verifier";
import { analyzeQuery, enrichQueryWithContext } from "./query-analyzer";
import type {
  ConversationContext,
  GroundingResult,
  QueryAnalysis,
  RAGChunk,
  RAGCitation,
  RAGOrchestratorConfig,
  RAGRequest,
  RAGResponse,
  RAGStreamChunk,
  RAGTiming,
  TokenUsage,
} from "./types";

const DEFAULT_RAG_MODEL = "claude-3-5-sonnet-latest";

const DEFAULT_CONFIG: RAGOrchestratorConfig = {
  enableCache: true,
  enableGrounding: true,
  enablePersonalization: false,
  maxChunks: 20,
  diversityWeight: 0.3,
  streamFirstToken: true,
};

interface GenerationOptions {
  query: string;
  context: string;
  systemPrompt: string;
  modelId: string;
  temperature: number;
}

interface InteractionData {
  request: RAGRequest;
  analysis: QueryAnalysis;
  chunks: RAGChunk[];
  answer: string;
  citations: RAGCitation[];
  grounding: GroundingResult | null;
  timing: RAGTiming;
}

interface RetrieveOptions {
  request: RAGRequest;
  enrichedQuery: string;
  analysis: QueryAnalysis;
  conversationContext: ConversationContext | null;
  timing: RAGTiming;
}

interface SaveMessageData {
  request: RAGRequest;
  answer: string;
  chunks: RAGChunk[];
  citations: RAGCitation[];
  grounding: GroundingResult | null;
  usage: TokenUsage;
  timing: RAGTiming;
}

function createEmptyTiming(): RAGTiming {
  return {
    analysisMs: 0,
    retrievalMs: 0,
    chunkingMs: 0,
    generationMs: 0,
    groundingMs: 0,
    totalMs: 0,
    firstTokenMs: null,
  };
}

function extractDocumentsAndScores(searchResult: {
  items: Array<{ type: string; data: unknown; relevance: number }>;
}): { documents: GenericDocument[]; scores: Map<string, number> } {
  const documents = searchResult.items
    .filter(
      (item): item is typeof item & { type: "document" } =>
        item.type === "document"
    )
    .map((item) => item.data as unknown as GenericDocument);

  const scores = new Map<string, number>(
    searchResult.items.map((item) => [
      item.type === "document" ? (item.data as { id: string }).id : "",
      item.relevance,
    ])
  );

  return { documents, scores };
}

export class RAGOrchestrator {
  private readonly db: Database;
  private readonly config: RAGOrchestratorConfig;
  private readonly cache = getRAGCache();

  constructor(db: Database, config: Partial<RAGOrchestratorConfig> = {}) {
    this.db = db;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async answer(request: RAGRequest): Promise<RAGResponse> {
    const startTime = performance.now();
    const timing = createEmptyTiming();

    const cacheResult = await this.tryCache(request, timing, startTime);
    if (cacheResult) {
      return cacheResult;
    }

    const { analysis, enrichedQuery, conversationContext } =
      this.analyzeRequest(request, timing);

    const { selectedChunks, assembled, citations } =
      await this.retrieveAndProcess({
        request,
        enrichedQuery,
        analysis,
        conversationContext,
        timing,
      });

    const generationStart = performance.now();
    const { answer, usage } = await this.generateAnswer({
      query: request.query,
      context: assembled.contextText,
      systemPrompt: assembled.systemPrompt,
      modelId: request.modelId ?? DEFAULT_RAG_MODEL,
      temperature: request.temperature ?? 0.3,
    });
    timing.generationMs = performance.now() - generationStart;

    const grounding = this.processGrounding(answer, selectedChunks, timing);
    timing.totalMs = performance.now() - startTime;

    await this.cacheAnswer(request, answer, citations, grounding);
    await this.saveConversationMessage({
      request,
      answer,
      chunks: selectedChunks,
      citations,
      grounding,
      usage,
      timing,
    });
    await this.recordInteraction({
      request,
      analysis,
      chunks: selectedChunks,
      answer,
      citations,
      grounding,
      timing,
    });

    return {
      answer,
      citations,
      grounding,
      conversationId: request.conversationId ?? null,
      usage,
      timing,
    };
  }

  async *stream(request: RAGRequest): AsyncGenerator<RAGStreamChunk> {
    const startTime = performance.now();
    const timing = createEmptyTiming();

    const { analysis, enrichedQuery, conversationContext } =
      this.analyzeRequest(request, timing);

    const { selectedChunks, assembled, citations } =
      await this.retrieveAndProcess({
        request,
        enrichedQuery,
        analysis,
        conversationContext,
        timing,
      });

    yield { type: "context", citation: citations[0] };

    const { answer, usage, firstTokenMs } = await this.streamGeneration(
      request,
      assembled,
      startTime,
      (content) => ({ type: "text" as const, content })
    );

    timing.generationMs =
      performance.now() -
      startTime -
      timing.analysisMs -
      timing.retrievalMs -
      timing.chunkingMs;
    timing.firstTokenMs = firstTokenMs;

    const grounding = this.processGrounding(answer, selectedChunks, timing);
    if (grounding && shouldIncludeGrounding(grounding)) {
      yield { type: "grounding", grounding };
    }

    timing.totalMs = performance.now() - startTime;

    await this.saveConversationMessage({
      request,
      answer,
      chunks: selectedChunks,
      citations,
      grounding,
      usage,
      timing,
    });
    await this.recordInteraction({
      request,
      analysis,
      chunks: selectedChunks,
      answer,
      citations,
      grounding,
      timing,
    });

    yield { type: "done", usage };
  }

  private async tryCache(
    request: RAGRequest,
    timing: RAGTiming,
    startTime: number
  ): Promise<RAGResponse | null> {
    if (!this.config.enableCache) {
      return null;
    }

    const queryHash = hashQuery(request.query, request.teamId);
    const cached = await this.cache.getAnswer(request.teamId, queryHash);

    if (!cached) {
      return null;
    }

    return {
      answer: cached.answer,
      citations: cached.citations as RAGCitation[],
      grounding: null,
      conversationId: request.conversationId ?? null,
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      timing: { ...timing, totalMs: performance.now() - startTime },
    };
  }

  private analyzeRequest(
    request: RAGRequest,
    timing: RAGTiming
  ): {
    analysis: QueryAnalysis;
    enrichedQuery: string;
    conversationContext: ConversationContext | null;
  } {
    const analysisStart = performance.now();
    const conversationContext = request.conversationContext ?? null;
    const analysis = analyzeQuery(
      request.query,
      conversationContext ?? undefined
    );
    const enrichedQuery = conversationContext
      ? enrichQueryWithContext(analysis, conversationContext)
      : analysis.normalizedQuery;
    timing.analysisMs = performance.now() - analysisStart;

    return { analysis, enrichedQuery, conversationContext };
  }

  private async retrieveAndProcess(opts: RetrieveOptions): Promise<{
    selectedChunks: RAGChunk[];
    assembled: ReturnType<typeof assembleContext>;
    citations: RAGCitation[];
  }> {
    const { request, enrichedQuery, analysis, conversationContext, timing } =
      opts;

    const retrievalStart = performance.now();
    const searchResult = await searchService.searchUnified({
      query: enrichedQuery,
      teamId: request.teamId,
      limit: this.config.maxChunks * 2,
      accessControlIds: request.accessControlIds,
      includeDocuments: true,
      includeMedia: request.includeMedia ?? true,
      sourceId: request.sourceId,
    });
    timing.retrievalMs = performance.now() - retrievalStart;

    const { documents, scores } = extractDocumentsAndScores(searchResult);

    const chunkingStart = performance.now();
    const allChunks = extractChunksFromDocuments(documents, scores);
    const rerankedChunks = rerankChunks(
      enrichedQuery,
      allChunks,
      this.config.maxChunks * 2
    );
    const selectedChunks = selectDiverse(
      rerankedChunks,
      this.config.maxChunks,
      this.config.diversityWeight
    );
    timing.chunkingMs = performance.now() - chunkingStart;

    const assembled = assembleContext(
      selectedChunks,
      analysis,
      conversationContext ?? undefined
    );
    const citations = Array.from(assembled.citationMap.values());

    return { selectedChunks, assembled, citations };
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
    const grounding = verifyGrounding(answer, chunks);
    timing.groundingMs = performance.now() - groundingStart;

    return shouldIncludeGrounding(grounding) ? grounding : null;
  }

  private async streamGeneration(
    request: RAGRequest,
    assembled: ReturnType<typeof assembleContext>,
    startTime: number,
    _onChunk: (content: string) => RAGStreamChunk
  ): Promise<{
    answer: string;
    usage: TokenUsage;
    firstTokenMs: number | null;
  }> {
    const messages: ChatMessage[] = [
      {
        role: "user",
        content: `Context:\n${assembled.contextText}\n\nQuestion: ${request.query}`,
      },
    ];

    let answer = "";
    let firstToken = true;
    let firstTokenMs: number | null = null;
    let usage: TokenUsage = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    };

    for await (const chunk of streamCompletion(messages, {
      systemPrompt: assembled.systemPrompt,
      modelId: request.modelId ?? DEFAULT_RAG_MODEL,
      temperature: request.temperature ?? 0.3,
    })) {
      if (chunk.type === "text") {
        if (firstToken) {
          firstTokenMs = performance.now() - startTime;
          firstToken = false;
        }
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

    return { answer, usage, firstTokenMs };
  }

  private async generateAnswer(
    options: GenerationOptions
  ): Promise<{ answer: string; usage: TokenUsage }> {
    const messages: ChatMessage[] = [
      {
        role: "user",
        content: `Context:\n${options.context}\n\nQuestion: ${options.query}`,
      },
    ];

    let answer = "";
    let usage: TokenUsage = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    };

    for await (const chunk of streamCompletion(messages, {
      systemPrompt: options.systemPrompt,
      modelId: options.modelId,
      temperature: options.temperature,
    })) {
      if (chunk.type === "text") {
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

  private async cacheAnswer(
    request: RAGRequest,
    answer: string,
    citations: RAGCitation[],
    grounding: GroundingResult | null
  ): Promise<void> {
    if (!this.config.enableCache) {
      return;
    }

    const queryHash = hashQuery(request.query, request.teamId);
    await this.cache.setAnswer(request.teamId, queryHash, {
      answer,
      citations,
      groundingScore: grounding?.overallScore ?? null,
      confidence: grounding?.confidence ?? null,
      generatedAt: Date.now(),
    });
  }

  private async saveConversationMessage(data: SaveMessageData): Promise<void> {
    const { request, answer, chunks, citations, grounding, usage, timing } =
      data;

    if (!request.conversationId) {
      return;
    }

    const manager = getConversationManager(this.db);
    await manager.addMessage(request.conversationId, "assistant", answer, {
      citations,
      contextDocIds: chunks.map((c) => c.documentId),
      groundingScore: grounding?.overallScore,
      confidence: grounding?.confidence,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      latencyMs: Math.round(timing.totalMs),
      firstTokenMs: timing.firstTokenMs
        ? Math.round(timing.firstTokenMs)
        : undefined,
    });
  }

  private async recordInteraction(data: InteractionData): Promise<void> {
    try {
      const avgChunkScore =
        data.chunks.length > 0
          ? data.chunks.reduce((sum, c) => sum + c.score, 0) /
            data.chunks.length
          : undefined;

      await createRAGInteraction(this.db, {
        userId: data.request.userId,
        teamId: data.request.teamId,
        conversationId: data.request.conversationId,
        query: data.request.query,
        queryHash: hashQuery(data.request.query, data.request.teamId),
        queryIntent: data.analysis.intent,
        retrievedDocs: data.chunks.length,
        usedChunks: data.chunks.length,
        avgChunkScore,
        answerLength: data.answer.length,
        citationCount: data.citations.length,
        groundingScore: data.grounding?.overallScore,
        confidence: data.grounding?.confidence,
        retrievalMs: Math.round(data.timing.retrievalMs),
        chunkingMs: Math.round(data.timing.chunkingMs),
        generationMs: Math.round(data.timing.generationMs),
        groundingMs: data.timing.groundingMs
          ? Math.round(data.timing.groundingMs)
          : undefined,
        totalMs: Math.round(data.timing.totalMs),
        firstTokenMs: data.timing.firstTokenMs
          ? Math.round(data.timing.firstTokenMs)
          : undefined,
      });
    } catch (error) {
      logger.error({ error }, "Failed to record RAG interaction");
    }
  }
}

let instance: RAGOrchestrator | null = null;

export function getRAGOrchestrator(
  db: Database,
  config?: Partial<RAGOrchestratorConfig>
): RAGOrchestrator {
  if (!instance) {
    instance = new RAGOrchestrator(db, config);
  }
  return instance;
}
