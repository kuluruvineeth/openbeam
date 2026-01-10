import {
  type AgentExecutionContext,
  type AgentStreamChunk,
  createEmptyState,
  createOverviewAgent,
  toolRegistry,
} from "@openplane/ai";
import { registerAllTools } from "@openplane/ai/tools";
import { logger as baseLogger } from "../../lib/logger";
import { createToolServices } from "../tool-binder";
import type {
  OverviewCitation,
  OverviewRequest,
  OverviewStreamChunk,
  OverviewTiming,
  OverviewUsage,
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

class StreamTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Stream timed out after ${timeoutMs}ms`);
    this.name = "StreamTimeoutError";
  }
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

async function* withStreamTimeout<T>(
  generator: AsyncGenerator<T>,
  timeoutMs: number
): AsyncGenerator<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new StreamTimeoutError(timeoutMs)), timeoutMs);
  });

  const iterator = generator[Symbol.asyncIterator]();

  while (true) {
    const result = await Promise.race([iterator.next(), timeoutPromise]);
    if (result.done) {
      break;
    }
    yield result.value;
  }
}

function createEmptyTiming(): OverviewTiming {
  return {
    fanoutMs: 0,
    retrievalMs: 0,
    contextBuildMs: 0,
    generationMs: 0,
    totalMs: 0,
    firstTokenMs: null,
  };
}

interface SynthesisData {
  query?: string;
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
  sourceCount?: number;
}

interface ToolResultWrapper {
  success?: boolean;
  data?: SynthesisData;
}

interface OverviewAgentOutput {
  answer?: string;
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
  sourceCount?: number;
}

function extractCitationsFromToolResult(
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

function extractCitationsFromAgentResult(
  output: unknown
): OverviewCitation[] | null {
  const result = output as OverviewAgentOutput;
  if (result?.citations && Array.isArray(result.citations)) {
    return result.citations.map((c) => ({
      index: c.index,
      documentId: c.documentId,
      title: c.title,
      url: c.url,
      snippet: c.snippet,
      connectorType: c.connectorType,
      sourceType: c.sourceType,
      relevanceScore: c.relevanceScore,
    }));
  }
  return null;
}

function extractGroundingScore(output: unknown): number | undefined {
  const result = output as OverviewAgentOutput;
  return result?.groundingScore;
}

interface ChunkProcessorState {
  isFirstToken: boolean;
  citations: OverviewCitation[];
  groundingScore?: number;
}

interface ChunkProcessorResult {
  chunks: OverviewStreamChunk[];
  state: ChunkProcessorState;
}

function buildTextChunk(
  chunk: AgentStreamChunk,
  timing: OverviewTiming,
  startTime: number,
  state: ChunkProcessorState
): ChunkProcessorResult {
  if (state.isFirstToken) {
    timing.firstTokenMs = performance.now() - startTime;
  }
  return {
    chunks: [{ type: "text", content: chunk.content ?? "" }],
    state: { ...state, isFirstToken: false },
  };
}

function buildToolCallChunk(
  chunk: AgentStreamChunk,
  state: ChunkProcessorState
): ChunkProcessorResult {
  return {
    chunks: [
      {
        type: "tool_call",
        toolCall: {
          toolCallId: chunk.toolCallId ?? "",
          toolName: chunk.toolName ?? "",
          toolInput: chunk.toolInput,
        },
      },
    ],
    state,
  };
}

function buildToolResultChunk(
  chunk: AgentStreamChunk,
  state: ChunkProcessorState
): ChunkProcessorResult {
  const resultChunk: OverviewStreamChunk = {
    type: "tool_result",
    toolResult: {
      toolCallId: chunk.toolCallId ?? "",
      toolName: chunk.toolName ?? "",
      toolOutput: chunk.toolOutput,
    },
  };

  const extracted = extractCitationsFromToolResult(
    chunk.toolOutput,
    chunk.toolName ?? ""
  );
  const chunks: OverviewStreamChunk[] = [resultChunk];

  for (const citation of extracted.citations) {
    chunks.push({ type: "citation", citation });
  }

  return {
    chunks,
    state: {
      ...state,
      citations:
        extracted.citations.length > 0 ? extracted.citations : state.citations,
      groundingScore: extracted.groundingScore ?? state.groundingScore,
    },
  };
}

function buildDoneChunk(
  chunk: AgentStreamChunk,
  timing: OverviewTiming,
  startTime: number,
  state: ChunkProcessorState
): ChunkProcessorResult {
  timing.generationMs =
    performance.now() - startTime - (timing.firstTokenMs ?? 0);
  timing.totalMs = performance.now() - startTime;

  const result = chunk.result;
  const usage: OverviewUsage = {
    promptTokens: result?.totalTokens?.inputTokens ?? 0,
    completionTokens: result?.totalTokens?.outputTokens ?? 0,
    totalTokens:
      (result?.totalTokens?.inputTokens ?? 0) +
      (result?.totalTokens?.outputTokens ?? 0),
  };

  const agentCitations = extractCitationsFromAgentResult(result?.output);
  const finalCitations = agentCitations ?? state.citations;

  const agentGroundingScore = extractGroundingScore(result?.output);
  const groundingScore =
    agentGroundingScore ??
    state.groundingScore ??
    (finalCitations.length > 0
      ? finalCitations.reduce((sum, c) => sum + c.relevanceScore, 0) /
        finalCitations.length
      : undefined);

  const chunks: OverviewStreamChunk[] = [];

  if (agentCitations && agentCitations.length > 0) {
    for (const citation of agentCitations) {
      if (!state.citations.some((c) => c.documentId === citation.documentId)) {
        chunks.push({ type: "citation", citation });
      }
    }
  }

  chunks.push({ type: "done", timing, usage, groundingScore });

  return {
    chunks,
    state: { ...state, citations: finalCitations, groundingScore },
  };
}

const CHUNK_PROCESSORS: Record<
  string,
  (
    chunk: AgentStreamChunk,
    timing: OverviewTiming,
    startTime: number,
    state: ChunkProcessorState
  ) => ChunkProcessorResult | null
> = {
  text: (chunk, timing, startTime, state) =>
    chunk.content ? buildTextChunk(chunk, timing, startTime, state) : null,
  "tool-call": (chunk, _timing, _startTime, state) =>
    chunk.toolCallId && chunk.toolName
      ? buildToolCallChunk(chunk, state)
      : null,
  "tool-result": (chunk, _timing, _startTime, state) =>
    chunk.toolCallId && chunk.toolName
      ? buildToolResultChunk(chunk, state)
      : null,
  done: (chunk, timing, startTime, state) =>
    buildDoneChunk(chunk, timing, startTime, state),
  step: () => null,
};

function processAgentChunk(
  chunk: AgentStreamChunk,
  timing: OverviewTiming,
  startTime: number,
  state: ChunkProcessorState
): ChunkProcessorResult {
  const processor = CHUNK_PROCESSORS[chunk.type];
  const result = processor?.(chunk, timing, startTime, state);
  return result ?? { chunks: [], state };
}

function createAgentContext(request: OverviewRequest): AgentExecutionContext {
  return {
    teamId: request.teamId,
    userId: request.userId ?? "",
    accessControl: request.accessControlIds,
    state: createEmptyState(),
  };
}

function createAgentConfig(request: OverviewRequest) {
  return {
    model: request.modelId
      ? { providerId: "google" as const, modelId: request.modelId }
      : undefined,
    temperature: request.temperature,
    maxSources: request.maxSources ?? 8,
  };
}

interface StreamStats {
  toolCallCount: number;
  textChunkCount: number;
  finalState: ChunkProcessorState;
}

async function* processStream(
  timeoutStream: AsyncGenerator<AgentStreamChunk>,
  timing: OverviewTiming,
  startTime: number
): AsyncGenerator<OverviewStreamChunk, StreamStats> {
  let state: ChunkProcessorState = { isFirstToken: true, citations: [] };
  let toolCallCount = 0;
  let textChunkCount = 0;

  for await (const chunk of timeoutStream) {
    if (chunk.type === "tool-call") {
      toolCallCount += 1;
    }
    if (chunk.type === "text" && chunk.content) {
      textChunkCount += 1;
    }

    const result = processAgentChunk(chunk, timing, startTime, state);
    state = result.state;
    for (const outputChunk of result.chunks) {
      yield outputChunk;
    }
  }

  return { toolCallCount, textChunkCount, finalState: state };
}

function logStreamCompletion(
  logger: ReturnType<typeof createRequestLogger>,
  startTime: number,
  timing: OverviewTiming,
  stats: StreamStats
): void {
  logger.info(
    {
      durationMs: Math.round(performance.now() - startTime),
      firstTokenMs: timing.firstTokenMs
        ? Math.round(timing.firstTokenMs)
        : null,
      toolCalls: stats.toolCallCount,
      textChunks: stats.textChunkCount,
      citationCount: stats.finalState.citations.length,
      groundingScore: stats.finalState.groundingScore,
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
  yield { type: "thinking" };

  try {
    registerAllTools();
    toolRegistry.bindServices(createToolServices());

    const agent = createOverviewAgent(createAgentConfig(request));
    const context = createAgentContext(request);
    const rawStream = agent.stream(request.query, context);
    const timeoutStream = withStreamTimeout(rawStream, STREAM_TIMEOUT_MS);

    const streamProcessor = processStream(timeoutStream, timing, startTime);
    let iteratorResult = await streamProcessor.next();

    while (!iteratorResult.done) {
      yield iteratorResult.value;
      iteratorResult = await streamProcessor.next();
    }

    logStreamCompletion(logger, startTime, timing, iteratorResult.value);
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
