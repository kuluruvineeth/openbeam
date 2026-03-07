import {
  buildThinkingProviderOptions,
  extractReasoningContent,
  registry,
} from "@openbeam/ai";
import type { GenericDocument, MediaDocument } from "@openbeam/vespa";
import { tool as aiTool, stepCountIs, streamText } from "ai";
import { z } from "zod";
import { logger } from "../../lib/logger";
import { searchService } from "../../search/service";
import {
  buildCitationMap,
  calculateGroundingScore,
  formatCitationPrompt,
} from "./citation-tracker";
import {
  buildContext,
  buildContextDocuments,
  selectDiverseDocuments,
} from "./context-builder";
import {
  deduplicateResults,
  generateFanoutQueries,
  mergeScores,
} from "./query-fanout";
import {
  type BuiltContext,
  type ContextDocument,
  DEFAULT_OVERVIEW_CONFIG,
  type OverviewCitation,
  type OverviewConfig,
  type OverviewRequest,
  type OverviewStreamChunk,
  type OverviewTiming,
  type OverviewUsage,
} from "./types";

const OVERVIEW_PROVIDER_ID = "google";
const OVERVIEW_MODEL_ID = "gemini-3-flash-preview";

function isGenericDocument(data: unknown): data is GenericDocument {
  return (
    typeof data === "object" &&
    data !== null &&
    "id" in data &&
    "document_type" in data &&
    "content" in data
  );
}

function isMediaDocument(data: unknown): data is MediaDocument {
  return (
    typeof data === "object" &&
    data !== null &&
    "id" in data &&
    "media_type" in data
  );
}

function mediaToGenericDocument(media: MediaDocument): GenericDocument {
  const content = [media.description, media.transcript, media.media_summary]
    .filter(Boolean)
    .join("\n\n");

  return {
    id: media.id,
    document_type: "media",
    title: media.title,
    content: content || media.description || "",
    url: media.url,
    source_path: media.url,
    created_at: media.created_at,
    updated_at: media.updated_at,
    author_name: media.author_name,
    author_id: media.author_id,
    connector_id: media.connector_id,
    connector_type: media.connector_type ?? "media",
    team_id: media.team_id,
    workspace_id: media.team_id,
    external_id: media.external_id,
    is_public: media.is_public,
    metadata: media.metadata ?? {},
  };
}

const AGENTIC_SYSTEM_PROMPT = `You are an AI assistant that provides accurate, grounded answers using enterprise data.

Your workflow:
1. Use search_documents to find relevant information
2. Analyze the retrieved documents
3. Synthesize a clear, cited answer

Guidelines:
- ALWAYS use search_documents first to find relevant sources
- Use inline citations [1], [2], etc. referencing the source documents
- Every factual claim must be supported by a citation
- If sources conflict, present both perspectives with citations
- Do not make claims not supported by the provided sources
- Keep responses concise and focused on the query
- Use markdown formatting for readability`;

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

function createEmptyUsage(): OverviewUsage {
  return {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  };
}

type SearchContext = {
  request: OverviewRequest;
  config: OverviewConfig;
  timing: OverviewTiming;
};

async function executeSearch(
  query: string,
  ctx: SearchContext
): Promise<{
  documents: GenericDocument[];
  scores: Map<string, number>;
}> {
  const { request, config, timing } = ctx;
  const fanoutStart = performance.now();
  const queries = config.enableFanout
    ? generateFanoutQueries(query, config.fanoutQueries)
    : [{ query, intent: "original" as const, weight: 1.0 }];
  timing.fanoutMs = performance.now() - fanoutStart;

  const retrievalStart = performance.now();
  const allDocuments: GenericDocument[] = [];
  let mergedScores = new Map<string, number>();

  for (const fanoutQuery of queries) {
    const result = await searchService.searchUnified({
      query: fanoutQuery.query,
      teamId: request.teamId,
      limit: config.maxSources * 2,
      accessControlIds: request.accessControlIds,
      includeDocuments: true,
      includeMedia: true,
    });

    const docs: GenericDocument[] = [];
    const scores = new Map<string, number>();

    for (const item of result.items) {
      if (item.type === "document" && isGenericDocument(item.data)) {
        docs.push(item.data);
        scores.set(item.data.id, item.relevance);
      } else if (item.type === "media" && isMediaDocument(item.data)) {
        const mediaDoc = mediaToGenericDocument(item.data);
        docs.push(mediaDoc);
        scores.set(item.data.id, item.relevance);
      }
    }

    allDocuments.push(...docs);
    mergedScores = mergeScores(mergedScores, scores, fanoutQuery.weight);
  }

  timing.retrievalMs = performance.now() - retrievalStart;
  const dedupedDocuments = deduplicateResults(allDocuments, mergedScores);

  return { documents: dedupedDocuments, scores: mergedScores };
}

function processContext(
  documents: GenericDocument[],
  scores: Map<string, number>,
  config: OverviewConfig,
  timing: OverviewTiming
): {
  contextDocs: ContextDocument[];
  builtContext: BuiltContext;
  citationMap: Map<number, OverviewCitation>;
} {
  const contextStart = performance.now();

  const contextDocs = buildContextDocuments(documents, scores, config);
  const diverseDocs = selectDiverseDocuments(
    contextDocs,
    config.maxSources,
    config.diversityWeight
  );
  const builtContext = buildContext(diverseDocs, config);
  const citationMap = buildCitationMap(builtContext.documents);

  timing.contextBuildMs = performance.now() - contextStart;

  return { contextDocs: builtContext.documents, builtContext, citationMap };
}

const searchDocumentsSchema = z.object({
  query: z.string().describe("The search query to find relevant documents"),
});

type SearchToolState = {
  citationMap: Map<number, OverviewCitation>;
  contextText: string;
};

function createSearchTool(
  request: OverviewRequest,
  config: OverviewConfig,
  timing: OverviewTiming,
  state: SearchToolState
) {
  return aiTool({
    description:
      "Search across all connected enterprise data sources to find relevant documents for the query",
    inputSchema: searchDocumentsSchema,
    execute: async ({ query }: z.infer<typeof searchDocumentsSchema>) => {
      const searchCtx: SearchContext = { request, config, timing };

      try {
        const { documents, scores } = await executeSearch(query, searchCtx);

        if (documents.length === 0) {
          return {
            success: false,
            message: "No relevant documents found",
            documentCount: 0,
          };
        }

        const {
          contextDocs,
          builtContext,
          citationMap: newCitationMap,
        } = processContext(documents, scores, config, timing);

        state.citationMap = newCitationMap;
        state.contextText = formatCitationPrompt(contextDocs);

        return {
          success: true,
          documentCount: contextDocs.length,
          contextTokens: builtContext.tokenCount,
          truncated: builtContext.truncated,
          sources: contextDocs.map((d, i) => ({
            index: i + 1,
            title: d.title,
            type: d.connectorType ?? "document",
          })),
        };
      } catch (error) {
        logger.error({ error, query }, "Search failed in agentic overview");
        return {
          success: false,
          message: error instanceof Error ? error.message : "Search failed",
          documentCount: 0,
        };
      }
    },
  });
}

function handleToolCallChunk(chunk: {
  toolCallId: string;
  toolName: string;
  input?: unknown;
}): OverviewStreamChunk {
  return {
    type: "tool_call",
    toolCall: {
      toolCallId: chunk.toolCallId,
      toolName: chunk.toolName,
      toolInput: chunk.input,
    },
  };
}

function* handleToolResultChunk(
  chunk: { toolCallId: string; toolName: string; output?: unknown },
  citationMap: Map<number, OverviewCitation>
): Generator<OverviewStreamChunk> {
  yield {
    type: "tool_result",
    toolResult: {
      toolCallId: chunk.toolCallId,
      toolName: chunk.toolName,
      toolOutput: chunk.output,
    },
  };

  for (const citation of citationMap.values()) {
    yield { type: "citation", citation };
  }
}

type StreamState = {
  content: string;
  firstToken: boolean;
  startTime: number;
  timing: OverviewTiming;
};

function handleTextDeltaChunk(
  text: string,
  streamState: StreamState
): OverviewStreamChunk | null {
  if (!text) {
    return null;
  }
  if (streamState.firstToken) {
    streamState.timing.firstTokenMs = performance.now() - streamState.startTime;
    streamState.firstToken = false;
  }
  streamState.content += text;
  return { type: "text", content: text };
}

function isToolCallChunk(chunk: unknown): chunk is {
  type: "tool-call";
  toolCallId: string;
  toolName: string;
  input?: unknown;
} {
  return (
    typeof chunk === "object" &&
    chunk !== null &&
    "type" in chunk &&
    chunk.type === "tool-call"
  );
}

function isToolResultChunk(chunk: unknown): chunk is {
  type: "tool-result";
  toolCallId: string;
  toolName: string;
  output?: unknown;
} {
  return (
    typeof chunk === "object" &&
    chunk !== null &&
    "type" in chunk &&
    chunk.type === "tool-result"
  );
}

function isTextDeltaChunk(
  chunk: unknown
): chunk is { type: "text-delta"; text?: string } {
  return (
    typeof chunk === "object" &&
    chunk !== null &&
    "type" in chunk &&
    chunk.type === "text-delta"
  );
}

function isReasoningDeltaChunk(chunk: unknown): boolean {
  if (!chunk || typeof chunk !== "object") {
    return false;
  }
  const obj = chunk as Record<string, unknown>;
  return obj.type === "reasoning" || obj.type === "reasoning-delta";
}

function handleReasoningChunk(chunk: unknown): OverviewStreamChunk | undefined {
  const content = extractReasoningContent(chunk);
  if (content) {
    return { type: "thinking", thinkingMessage: content };
  }
  return;
}

function* processChunk(
  chunk: unknown,
  toolState: SearchToolState,
  streamState: StreamState
): Generator<OverviewStreamChunk> {
  if (isReasoningDeltaChunk(chunk)) {
    const result = handleReasoningChunk(chunk);
    if (result) {
      yield result;
    }
    return;
  }

  if (isToolCallChunk(chunk)) {
    yield handleToolCallChunk({
      toolCallId: chunk.toolCallId,
      toolName: chunk.toolName,
      input: chunk.input,
    });
    return;
  }

  if (isToolResultChunk(chunk)) {
    yield* handleToolResultChunk(
      {
        toolCallId: chunk.toolCallId,
        toolName: chunk.toolName,
        output: chunk.output,
      },
      toolState.citationMap
    );
    return;
  }

  if (isTextDeltaChunk(chunk)) {
    const text = chunk.text ?? "";
    const textChunk = handleTextDeltaChunk(text, streamState);
    if (textChunk) {
      yield textChunk;
    }
  }
}

async function* processStream(
  fullStream: AsyncIterable<unknown>,
  toolState: SearchToolState,
  streamState: StreamState
): AsyncGenerator<OverviewStreamChunk> {
  for await (const chunk of fullStream) {
    yield* processChunk(chunk, toolState, streamState);
  }
}

export async function* streamAgenticOverview(
  request: OverviewRequest
): AsyncGenerator<OverviewStreamChunk> {
  const startTime = performance.now();
  const timing = createEmptyTiming();
  const config: OverviewConfig = {
    ...DEFAULT_OVERVIEW_CONFIG,
    maxSources: request.maxSources ?? DEFAULT_OVERVIEW_CONFIG.maxSources,
    enableFanout: request.enableFanout ?? DEFAULT_OVERVIEW_CONFIG.enableFanout,
  };

  yield { type: "thinking" };

  const toolState: SearchToolState = {
    citationMap: new Map<number, OverviewCitation>(),
    contextText: "",
  };

  const searchDocumentsTool = createSearchTool(
    request,
    config,
    timing,
    toolState
  );

  const model = registry.chatModel(
    OVERVIEW_PROVIDER_ID,
    request.modelId ?? OVERVIEW_MODEL_ID
  );

  const userPrompt = `Answer the following question by first searching for relevant documents: "${request.query}"`;

  const streamState: StreamState = {
    content: "",
    firstToken: true,
    startTime,
    timing,
  };

  let usage = createEmptyUsage();

  try {
    const thinkingOptions = buildThinkingProviderOptions({ enabled: true });

    const result = streamText({
      model,
      system: AGENTIC_SYSTEM_PROMPT,
      prompt: userPrompt,
      tools: {
        search_documents: searchDocumentsTool,
      },
      stopWhen: stepCountIs(5),
      temperature: request.temperature ?? 0.3,
      providerOptions: thinkingOptions as Parameters<
        typeof streamText
      >[0]["providerOptions"],
    });

    yield* processStream(result.fullStream, toolState, streamState);

    const [finalUsage] = await Promise.all([result.usage]);
    usage = {
      promptTokens: finalUsage?.inputTokens ?? 0,
      completionTokens: finalUsage?.outputTokens ?? 0,
      totalTokens:
        (finalUsage?.inputTokens ?? 0) + (finalUsage?.outputTokens ?? 0),
    };
  } catch (error) {
    logger.error({ error, query: request.query }, "Agentic overview failed");
    const message =
      error instanceof Error ? error.message : "Failed to generate overview";
    yield { type: "error", error: message };
    return;
  }

  timing.generationMs = performance.now() - startTime - timing.retrievalMs;
  timing.totalMs = performance.now() - startTime;

  const groundingScore = calculateGroundingScore(
    streamState.content,
    toolState.citationMap
  );

  yield {
    type: "done",
    usage,
    timing,
    groundingScore,
  };
}

export class AgenticOverviewOrchestrator {
  private readonly config: OverviewConfig;

  constructor(config: Partial<OverviewConfig> = {}) {
    this.config = { ...DEFAULT_OVERVIEW_CONFIG, ...config };
  }

  async *stream(request: OverviewRequest): AsyncGenerator<OverviewStreamChunk> {
    for await (const chunk of streamAgenticOverview({
      ...request,
      maxSources: request.maxSources ?? this.config.maxSources,
      enableFanout: request.enableFanout ?? this.config.enableFanout,
    })) {
      yield chunk;
    }
  }
}

export function createAgenticOverviewOrchestrator(
  config?: Partial<OverviewConfig>
): AgenticOverviewOrchestrator {
  return new AgenticOverviewOrchestrator(config);
}
