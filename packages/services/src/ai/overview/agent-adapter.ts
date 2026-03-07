import {
  type AgentExecutionContext,
  createEmptyState,
  createOverviewAgent,
  embedQueryWithCache,
  registerAllBuiltinTools,
  toolRegistry,
} from "@openbeam/ai";
import {
  type AgentEvent,
  adaptAgentStream,
  StreamTimeoutError,
  withTimeout,
} from "@openbeam/ai/streaming";
import { registerAllTools } from "@openbeam/ai/tools";
import { getSemanticCache } from "@openbeam/redis";
import { logger as baseLogger } from "../../lib/logger";
import { createToolServices } from "../tool-binder";
import {
  DEFAULT_OVERVIEW_CONFIG,
  type OverviewCitation,
  type OverviewRequest,
  type OverviewStreamChunk,
  type OverviewTiming,
  type OverviewUsage,
} from "./types";

const STREAM_TIMEOUT_MS = 60_000;

function createRequestLogger(request: OverviewRequest) {
  return baseLogger.child({
    component: "overview-agent",
    teamId: request.teamId,
    userId: request.userId,
    queryLength: request.query.length,
  });
}

function getErrorMessage(error: unknown, isTimeout: boolean): string {
  if (isTimeout) {
    return "Request timed out. Please try a simpler query.";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Overview generation failed";
}

function createEmptyTiming(): OverviewTiming {
  return {
    fanoutMs: 0,
    retrievalMs: 0,
    contextBuildMs: 0,
    generationMs: 0,
    totalMs: 0,
    firstTokenMs: null,
    cacheCheckMs: 0,
  };
}

function createEmptyUsage(): OverviewUsage {
  return { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
}

type SemanticCacheResult =
  | {
      hit: true;
      queryEmbedding: number[];
      entry: {
        response: {
          answer: string;
          citations: OverviewCitation[];
          groundingScore: number | null;
        };
      };
      similarity: number;
    }
  | {
      hit: false;
      queryEmbedding: number[] | undefined;
    };

async function checkAgentSemanticCache(
  request: OverviewRequest,
  timing: OverviewTiming,
  logger: ReturnType<typeof createRequestLogger>
): Promise<SemanticCacheResult> {
  const cacheCheckStart = performance.now();

  try {
    const queryEmbedding = await embedQueryWithCache(request.query);
    const semanticCache = getSemanticCache();
    const cached = await semanticCache.findSimilar(
      request.teamId,
      queryEmbedding,
      DEFAULT_OVERVIEW_CONFIG.semanticCacheThreshold
    );

    timing.cacheCheckMs = performance.now() - cacheCheckStart;

    if (cached) {
      logger.info(
        {
          similarity: cached.similarity,
          cacheCheckMs: Math.round(timing.cacheCheckMs ?? 0),
        },
        "Semantic cache hit"
      );
      return {
        hit: true,
        queryEmbedding,
        entry: {
          response: {
            answer: cached.entry.response.answer,
            citations: cached.entry.response.citations as OverviewCitation[],
            groundingScore: cached.entry.response.groundingScore,
          },
        },
        similarity: cached.similarity,
      };
    }

    return { hit: false, queryEmbedding };
  } catch (error) {
    logger.warn({ error }, "Semantic cache check failed");
    timing.cacheCheckMs = performance.now() - cacheCheckStart;
    return { hit: false, queryEmbedding: undefined };
  }
}

interface StoreAgentCacheParams {
  request: OverviewRequest;
  queryEmbedding: number[] | undefined;
  content: string;
  citations: OverviewCitation[];
  groundingScore: number | null;
  logger: ReturnType<typeof createRequestLogger>;
}

async function storeAgentInSemanticCache(
  params: StoreAgentCacheParams
): Promise<void> {
  const {
    request,
    queryEmbedding,
    content,
    citations,
    groundingScore,
    logger,
  } = params;

  if (!queryEmbedding) {
    return;
  }

  if (!content.trim()) {
    logger.warn("Skipping cache store - no content generated");
    return;
  }

  try {
    const semanticCache = getSemanticCache();
    await semanticCache.store(request.teamId, request.query, queryEmbedding, {
      answer: content,
      citations,
      groundingScore,
      confidence: null,
      generatedAt: Date.now(),
    });
    logger.info("Stored result in semantic cache");
  } catch (error) {
    logger.warn({ error }, "Failed to store in semantic cache");
  }
}

interface SynthesisData {
  citations?: Array<{
    index: number;
    documentId: string;
    title: string;
    url?: string;
    snippet: string;
    connectorType?: string;
    sourceType: "document" | "media";
    relevanceScore: number;
  }>;
  groundingScore?: number;
}

interface ToolResultWrapper {
  success?: boolean;
  data?: SynthesisData;
}

function extractCitationsFromToolOutput(
  toolOutput: unknown,
  toolName: string
): { citations: OverviewCitation[]; groundingScore?: number } {
  if (toolName === "overview_synthesize") {
    const wrapper = toolOutput as ToolResultWrapper;
    const data = wrapper?.data;
    if (data?.citations) {
      const citations = data.citations.map((c) => ({
        index: c.index,
        documentId: c.documentId,
        title: c.title,
        url: c.url,
        snippet: c.snippet,
        connectorType: c.connectorType,
        sourceType: c.sourceType,
        relevanceScore: c.relevanceScore,
      }));
      return { citations, groundingScore: data.groundingScore };
    }
  }

  return { citations: [] };
}

function createAgentContext(request: OverviewRequest): AgentExecutionContext {
  return {
    teamId: request.teamId,
    userId: request.userId ?? "",
    accessControl: request.accessControlIds,
    state: createEmptyState(),
  };
}

const DEFAULT_OVERVIEW_MODEL = {
  providerId: "anthropic" as const,
  modelId: "claude-sonnet-4-5",
};

function createAgentConfig(request: OverviewRequest) {
  const baseModel = request.modelId
    ? { providerId: "anthropic" as const, modelId: request.modelId }
    : DEFAULT_OVERVIEW_MODEL;

  return {
    model: {
      ...baseModel,
      temperature: request.temperature,
      maxTokens: 16_384,
      thinking: {
        enabled: true,
        thinkingLevel: "low" as const,
        includeThoughts: true,
      },
    },
    maxSources: request.maxSources ?? 8,
  };
}

interface StreamState {
  isFirstToken: boolean;
  citations: OverviewCitation[];
  groundingScore?: number;
  collectedContent: string;
  toolCallCount: number;
  textChunkCount: number;
}

function createInitialState(): StreamState {
  return {
    isFirstToken: true,
    citations: [],
    groundingScore: undefined,
    collectedContent: "",
    toolCallCount: 0,
    textChunkCount: 0,
  };
}

function buildDoneChunk(
  event: AgentEvent & { type: "done" },
  state: StreamState,
  timing: OverviewTiming,
  startTime: number
): OverviewStreamChunk {
  timing.generationMs =
    performance.now() - startTime - (timing.firstTokenMs ?? 0);
  timing.totalMs = performance.now() - startTime;

  const tokens = event.metadata?.tokens as
    | { inputTokens?: number; outputTokens?: number }
    | undefined;

  const usage: OverviewUsage = {
    promptTokens: tokens?.inputTokens ?? 0,
    completionTokens: tokens?.outputTokens ?? 0,
    totalTokens: (tokens?.inputTokens ?? 0) + (tokens?.outputTokens ?? 0),
  };

  const groundingScore =
    state.groundingScore ??
    (state.citations.length > 0
      ? state.citations.reduce((sum, c) => sum + c.relevanceScore, 0) /
        state.citations.length
      : undefined);

  return { type: "done", timing, usage, groundingScore };
}

interface ChunkProcessingContext {
  event: AgentEvent;
  state: StreamState;
  timing: OverviewTiming;
  startTime: number;
  logger: ReturnType<typeof createRequestLogger>;
}

function eventToOverviewChunks(ctx: ChunkProcessingContext): {
  chunks: OverviewStreamChunk[];
  state: StreamState;
} {
  const { event, state, timing, startTime, logger } = ctx;
  const chunks: OverviewStreamChunk[] = [];
  let newState = state;

  switch (event.type) {
    case "thinking": {
      logger.debug(
        { thinkingMessage: event.message?.slice(0, 100) },
        "Received thinking event"
      );
      chunks.push({ type: "thinking", thinkingMessage: event.message });
      break;
    }

    case "status": {
      chunks.push({
        type: "status",
        status: event.status,
        statusMessage: event.message,
      });
      break;
    }

    case "tool_call": {
      logger.debug(
        { toolName: event.toolName, toolCallId: event.toolCallId },
        "Received tool_call event"
      );
      newState = { ...state, toolCallCount: state.toolCallCount + 1 };
      chunks.push({
        type: "tool_call",
        toolCall: {
          toolCallId: event.toolCallId,
          toolName: event.toolName,
          toolInput: event.toolInput,
          ephemeral: event.visibility === "ephemeral",
        },
      });
      break;
    }

    case "tool_result": {
      const toolOutput = event.toolOutput as
        | { success?: boolean; error?: { code?: string; message?: string } }
        | undefined;
      const toolSuccess = toolOutput?.success ?? true;

      if (toolSuccess) {
        logger.info(
          {
            toolName: event.toolName,
            toolCallId: event.toolCallId,
          },
          "Tool execution succeeded"
        );
      } else {
        logger.warn(
          {
            toolName: event.toolName,
            toolCallId: event.toolCallId,
            errorCode: toolOutput?.error?.code,
            errorMessage: toolOutput?.error?.message,
          },
          "Tool execution failed"
        );
      }

      chunks.push({
        type: "tool_result",
        toolResult: {
          toolCallId: event.toolCallId,
          toolName: event.toolName,
          toolOutput: event.toolOutput,
        },
      });

      const extracted = extractCitationsFromToolOutput(
        event.toolOutput,
        event.toolName
      );

      logger.debug(
        {
          toolName: event.toolName,
          extractedCitations: extracted.citations.length,
          groundingScore: extracted.groundingScore,
        },
        "Citation extraction result"
      );

      for (const citation of extracted.citations) {
        chunks.push({ type: "citation", citation });
      }

      if (extracted.citations.length > 0) {
        newState = {
          ...state,
          citations: extracted.citations,
          groundingScore: extracted.groundingScore ?? state.groundingScore,
        };
      }
      break;
    }

    case "text": {
      if (state.isFirstToken) {
        timing.firstTokenMs = performance.now() - startTime;
      }
      newState = {
        ...state,
        isFirstToken: false,
        textChunkCount: state.textChunkCount + 1,
        collectedContent: state.collectedContent + event.content,
      };
      chunks.push({ type: "text", content: event.content });
      break;
    }

    case "error": {
      chunks.push({ type: "error", error: event.message });
      break;
    }

    case "done": {
      chunks.push(buildDoneChunk(event, state, timing, startTime));
      break;
    }

    default:
      break;
  }

  return { chunks, state: newState };
}

function logStreamCompletion(
  logger: ReturnType<typeof createRequestLogger>,
  startTime: number,
  timing: OverviewTiming,
  state: StreamState
): void {
  logger.info(
    {
      durationMs: Math.round(performance.now() - startTime),
      firstTokenMs: timing.firstTokenMs
        ? Math.round(timing.firstTokenMs)
        : null,
      toolCalls: state.toolCallCount,
      textChunks: state.textChunkCount,
      citationCount: state.citations.length,
      groundingScore: state.groundingScore,
    },
    "Overview generation completed"
  );
}

function logStreamError(
  logger: ReturnType<typeof createRequestLogger>,
  error: unknown,
  durationMs: number,
  isTimeout: boolean
): void {
  logger.error(
    {
      error: error instanceof Error ? error.message : String(error),
      errorType: error instanceof Error ? error.constructor.name : "unknown",
      durationMs,
      isTimeout,
    },
    isTimeout ? "Overview generation timed out" : "Overview generation failed"
  );
}

export async function* streamOverviewWithAgent(
  request: OverviewRequest
): AsyncGenerator<OverviewStreamChunk> {
  const startTime = performance.now();
  const timing = createEmptyTiming();
  const logger = createRequestLogger(request);

  logger.info("Starting overview generation");

  const cacheResult = await checkAgentSemanticCache(request, timing, logger);

  if (cacheResult.hit) {
    const { entry, similarity } = cacheResult;
    for (const citation of entry.response.citations) {
      yield { type: "citation", citation };
    }
    yield { type: "text", content: entry.response.answer };
    timing.totalMs = performance.now() - startTime;
    yield {
      type: "done",
      timing,
      usage: createEmptyUsage(),
      groundingScore: entry.response.groundingScore ?? undefined,
      fromCache: true,
      cacheSimilarity: similarity,
    };
    return;
  }

  const queryEmbedding = cacheResult.queryEmbedding;

  try {
    registerAllTools();
    registerAllBuiltinTools();
    toolRegistry.bindServices(createToolServices());

    const agent = createOverviewAgent(createAgentConfig(request));
    const context = createAgentContext(request);
    const rawStream = agent.stream(request.query, context);

    const adaptedStream = adaptAgentStream(rawStream, {
      visibilityFilter: ["visible", "ephemeral"],
      emitStatusEvents: true,
      emitThinkingEvents: true,
    });

    const timeoutStream = withTimeout(adaptedStream, {
      timeoutMs: STREAM_TIMEOUT_MS,
      errorMessage: `Overview generation timed out after ${STREAM_TIMEOUT_MS}ms`,
    });

    let state = createInitialState();

    logger.debug("Starting to process agent stream events");

    const eventCounts = {
      thinking: 0,
      status: 0,
      tool_call: 0,
      tool_result: 0,
      text: 0,
      error: 0,
      done: 0,
      other: 0,
    };

    for await (const event of timeoutStream) {
      const eventKey = event.type as keyof typeof eventCounts;
      if (eventKey in eventCounts) {
        eventCounts[eventKey] += 1;
      } else {
        eventCounts.other += 1;
      }

      logger.debug(
        { eventType: event.type, eventCounts },
        "Received agent event"
      );
      const result = eventToOverviewChunks({
        event,
        state,
        timing,
        startTime,
        logger,
      });
      state = result.state;

      for (const chunk of result.chunks) {
        yield chunk;
      }
    }

    logger.info(
      {
        eventCounts,
        totalEvents:
          eventCounts.thinking +
          eventCounts.status +
          eventCounts.tool_call +
          eventCounts.tool_result +
          eventCounts.text +
          eventCounts.error +
          eventCounts.done,
      },
      "Agent stream event summary"
    );

    logStreamCompletion(logger, startTime, timing, state);

    await storeAgentInSemanticCache({
      request,
      queryEmbedding,
      content: state.collectedContent,
      citations: state.citations,
      groundingScore: state.groundingScore ?? null,
      logger,
    });
  } catch (error) {
    const isTimeout = error instanceof StreamTimeoutError;
    logStreamError(
      logger,
      error,
      Math.round(performance.now() - startTime),
      isTimeout
    );
    yield { type: "error", error: getErrorMessage(error, isTimeout) };
  }
}

export class AgentOverviewOrchestrator {
  stream(request: OverviewRequest): AsyncGenerator<OverviewStreamChunk> {
    return streamOverviewWithAgent(request);
  }
}

let orchestratorInstance: AgentOverviewOrchestrator | null = null;

export function getAgentOverviewOrchestrator(): AgentOverviewOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new AgentOverviewOrchestrator();
  }
  return orchestratorInstance;
}
