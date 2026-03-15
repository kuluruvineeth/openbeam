import { embedQueryWithCache, streamCompletion } from "@openbeam/ai";
import { getSearchCache, getSemanticCache } from "@openbeam/redis";
import type { GenericDocument, MediaDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { searchService } from "../../search/service";
import {
  buildCitationMap,
  calculateGroundingScore,
  extractCitationsRealtime,
  formatCitationPrompt,
} from "./citation-tracker";
import {
  analyzeQueryComplexity,
  selectModelForComplexity,
} from "./complexity-analyzer";
import {
  buildContext,
  buildContextDocuments,
  selectDiverseDocuments,
} from "./context-builder";
import { getOverviewMetricsCollector } from "./metrics";
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
  type OverviewResponse,
  type OverviewStreamChunk,
  type OverviewTiming,
  type OverviewUsage,
} from "./types";

const OVERVIEW_PROVIDER_ID = "google";
const DEFAULT_MODEL_ID = "gemini-3-flash-preview";

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

const SYSTEM_PROMPT = `You are an AI overview assistant for an enterprise search platform.

You MUST always produce a text response. Never stop after thinking without writing a response.

When sources are provided, synthesize them into a clear overview:
- Be concise and direct. Front-load the most important information.
- Use inline citations like [1], [2] to reference sources.
- If sources conflict, present both perspectives with citations.
- Use markdown formatting (bullet points, bold for emphasis).
- Aim for 2-4 paragraphs.

When no relevant sources are found for the query, respond with a brief, friendly message like:
"I don't have enough indexed data to provide a comprehensive overview on this topic yet. As more data sources are connected and indexed, I'll be able to give you better answers. Try refining your search or exploring related topics that may be covered in the current dataset."

Always write your response as text output, never only as thinking.`;

function createEmptyTiming(): OverviewTiming {
  return {
    cacheCheckMs: 0,
    fanoutMs: 0,
    retrievalMs: 0,
    contextBuildMs: 0,
    generationMs: 0,
    totalMs: 0,
    firstTokenMs: null,
  };
}

function selectModel(
  request: OverviewRequest,
  config: OverviewConfig
): { providerId: string; modelId: string } {
  if (request.modelId) {
    return { providerId: OVERVIEW_PROVIDER_ID, modelId: request.modelId };
  }

  if (!config.enableModelRouting) {
    return { providerId: OVERVIEW_PROVIDER_ID, modelId: DEFAULT_MODEL_ID };
  }

  const complexity = analyzeQueryComplexity(request.query);
  return selectModelForComplexity(complexity);
}

function createEmptyUsage(): OverviewUsage {
  return {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  };
}

type SearchResultItem = {
  type: "document" | "media";
  data: unknown;
  relevance: number;
};

function extractDocumentsFromResults(items: SearchResultItem[]): {
  docs: GenericDocument[];
  scores: Map<string, number>;
} {
  const docs: GenericDocument[] = [];
  const scores = new Map<string, number>();

  for (const item of items) {
    if (item.type === "document" && isGenericDocument(item.data)) {
      docs.push(item.data);
      scores.set(item.data.id, item.relevance);
    } else if (item.type === "media" && isMediaDocument(item.data)) {
      const mediaDoc = mediaToGenericDocument(item.data);
      docs.push(mediaDoc);
      scores.set(item.data.id, item.relevance);
    }
  }

  return { docs, scores };
}

type FanoutQuery = {
  query: string;
  intent: string;
  weight: number;
};

type SearchCacheType = ReturnType<typeof getSearchCache>;

async function fetchFromCacheOrSearch(
  fanoutQuery: FanoutQuery,
  request: OverviewRequest,
  config: OverviewConfig,
  searchCache: SearchCacheType | null
): Promise<{
  docs: GenericDocument[];
  scores: Map<string, number>;
  cacheHit: boolean;
}> {
  if (searchCache) {
    const cached = await searchCache.get(request.teamId, fanoutQuery.query);
    if (cached) {
      const fetchedDocs = await searchService.getDocumentsByIds({
        ids: cached.documentIds,
        teamId: request.teamId,
      });
      const cachedDocs = fetchedDocs.filter(isGenericDocument);
      const cachedScores = new Map<string, number>(
        Object.entries(cached.scores).map(([k, v]) => [k, v])
      );
      return { docs: cachedDocs, scores: cachedScores, cacheHit: true };
    }
  }

  const result = await searchService.searchUnified({
    query: fanoutQuery.query,
    teamId: request.teamId,
    limit: config.maxSources * 2,
    accessControlIds: request.accessControlIds,
    includeDocuments: true,
    includeMedia: true,
  });

  const { docs, scores } = extractDocumentsFromResults(
    result.items as SearchResultItem[]
  );

  if (searchCache && docs.length > 0) {
    await searchCache.set(request.teamId, fanoutQuery.query, {
      documentIds: docs.map((d) => d.id),
      scores: Object.fromEntries(scores),
      totalCount: result.items.length,
      cachedAt: Date.now(),
    });
  }

  return { docs, scores, cacheHit: false };
}

async function retrieveDocuments(
  request: OverviewRequest,
  config: OverviewConfig,
  timing: OverviewTiming
): Promise<{
  documents: GenericDocument[];
  scores: Map<string, number>;
  searchCacheHits: number;
}> {
  const fanoutStart = performance.now();
  const queries = config.enableFanout
    ? generateFanoutQueries(request.query, config.fanoutQueries)
    : [{ query: request.query, intent: "original" as const, weight: 1.0 }];
  timing.fanoutMs = performance.now() - fanoutStart;

  const retrievalStart = performance.now();
  const searchCache = config.enableSearchCache ? getSearchCache() : null;
  const allDocuments: GenericDocument[] = [];
  let mergedScores = new Map<string, number>();
  let searchCacheHits = 0;

  for (const fanoutQuery of queries) {
    const { docs, scores, cacheHit } = await fetchFromCacheOrSearch(
      fanoutQuery,
      request,
      config,
      searchCache
    );
    if (cacheHit) {
      searchCacheHits += 1;
    }
    allDocuments.push(...docs);
    mergedScores = mergeScores(mergedScores, scores, fanoutQuery.weight);
  }

  timing.retrievalMs = performance.now() - retrievalStart;

  const dedupedDocuments = deduplicateResults(allDocuments, mergedScores);

  return { documents: dedupedDocuments, scores: mergedScores, searchCacheHits };
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

async function checkSemanticCache(
  request: OverviewRequest,
  config: OverviewConfig,
  timing: OverviewTiming,
  startTime: number
): Promise<{
  cached: boolean;
  response?: OverviewResponse;
  queryEmbedding?: number[];
  similarity?: number;
}> {
  if (!config.enableSemanticCache) {
    return { cached: false };
  }

  const cacheCheckStart = performance.now();
  try {
    const queryEmbedding = await embedQueryWithCache(request.query);
    const semanticCache = getSemanticCache();
    const cached = await semanticCache.findSimilar(
      request.teamId,
      queryEmbedding,
      config.semanticCacheThreshold
    );

    timing.cacheCheckMs = performance.now() - cacheCheckStart;

    if (cached) {
      const { entry, similarity } = cached;
      logger.info(
        {
          teamId: request.teamId,
          similarity,
          queryLength: request.query.length,
        },
        "Semantic cache hit"
      );

      return {
        cached: true,
        queryEmbedding,
        similarity,
        response: {
          content: entry.response.answer,
          citations: entry.response.citations as OverviewCitation[],
          groundingScore: entry.response.groundingScore,
          timing: { ...timing, totalMs: performance.now() - startTime },
          usage: createEmptyUsage(),
        },
      };
    }

    return { cached: false, queryEmbedding };
  } catch (error) {
    logger.warn(
      { error },
      "Semantic cache check failed, proceeding without cache"
    );
    timing.cacheCheckMs = performance.now() - cacheCheckStart;
    return { cached: false };
  }
}

interface SemanticCacheStoreParams {
  request: OverviewRequest;
  queryEmbedding: number[] | undefined;
  content: string;
  citations: OverviewCitation[];
  groundingScore: number | null;
}

async function storeInSemanticCache(
  params: SemanticCacheStoreParams
): Promise<void> {
  const { request, queryEmbedding, content, citations, groundingScore } =
    params;

  if (!(queryEmbedding && content)) {
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
  } catch (error) {
    logger.warn({ error }, "Failed to store in semantic cache");
  }
}

function recordCachedMetrics(
  request: OverviewRequest,
  response: OverviewResponse
): void {
  const complexity = analyzeQueryComplexity(request.query);
  getOverviewMetricsCollector().record({
    latencyMs: response.timing.totalMs,
    semanticCacheHit: true,
    embeddingCacheHits: 0,
    searchCacheHits: 0,
    modelUsed: "cached",
    teamId: request.teamId,
    complexity,
  });
}

async function collectStreamContent(
  userMessage: string,
  modelId: string,
  temperature: number
): Promise<{ content: string; usage: OverviewUsage }> {
  let content = "";
  let usage = createEmptyUsage();

  for await (const chunk of streamCompletion(
    [{ role: "user", content: userMessage }],
    {
      systemPrompt: SYSTEM_PROMPT,
      providerId: OVERVIEW_PROVIDER_ID,
      modelId,
      temperature,
      enableThinking: true,
    }
  )) {
    if (chunk.type === "text") {
      content += chunk.content;
    }
    if (chunk.type === "done" && chunk.usage) {
      usage = parseUsageFromChunk(chunk);
    }
  }

  return { content, usage };
}

export async function generateOverview(
  request: OverviewRequest
): Promise<OverviewResponse> {
  const startTime = performance.now();
  const timing = createEmptyTiming();
  const config = {
    ...DEFAULT_OVERVIEW_CONFIG,
    maxSources: request.maxSources ?? DEFAULT_OVERVIEW_CONFIG.maxSources,
    enableFanout: request.enableFanout ?? DEFAULT_OVERVIEW_CONFIG.enableFanout,
  };

  const cacheResult = await checkSemanticCache(
    request,
    config,
    timing,
    startTime
  );
  if (cacheResult.cached && cacheResult.response) {
    recordCachedMetrics(request, cacheResult.response);
    return cacheResult.response;
  }

  const { documents, scores, searchCacheHits } = await retrieveDocuments(
    request,
    config,
    timing
  );

  if (documents.length === 0) {
    return {
      content:
        "I couldn't find relevant information to answer your query. Please try rephrasing your question or searching for different terms.",
      citations: [],
      groundingScore: null,
      timing: { ...timing, totalMs: performance.now() - startTime },
      usage: createEmptyUsage(),
    };
  }

  const { contextDocs, citationMap } = processContext(
    documents,
    scores,
    config,
    timing
  );

  const generationStart = performance.now();
  const contextText = formatCitationPrompt(contextDocs);
  const userMessage = buildUserMessage(request.query, contextText);
  const { modelId } = selectModel(request, config);

  const { content, usage } = await collectStreamContent(
    userMessage,
    modelId,
    request.temperature ?? 0.3
  );

  timing.generationMs = performance.now() - generationStart;
  timing.totalMs = performance.now() - startTime;

  const { newCitations } = extractCitationsRealtime(
    content,
    citationMap,
    new Set()
  );
  const groundingScore = calculateGroundingScore(content, citationMap);

  await storeInSemanticCache({
    request,
    queryEmbedding: cacheResult.queryEmbedding,
    content,
    citations: newCitations,
    groundingScore,
  });

  const complexity = analyzeQueryComplexity(request.query);
  getOverviewMetricsCollector().record({
    latencyMs: timing.totalMs,
    semanticCacheHit: false,
    embeddingCacheHits: 0,
    searchCacheHits,
    modelUsed: modelId,
    teamId: request.teamId,
    complexity,
  });

  return {
    content,
    citations: newCitations,
    groundingScore,
    timing,
    usage,
  };
}

function createStreamConfig(request: OverviewRequest): OverviewConfig {
  return {
    ...DEFAULT_OVERVIEW_CONFIG,
    maxSources: request.maxSources ?? DEFAULT_OVERVIEW_CONFIG.maxSources,
    enableFanout: request.enableFanout ?? DEFAULT_OVERVIEW_CONFIG.enableFanout,
  };
}

function buildUserMessage(query: string, contextText: string): string {
  if (!contextText.trim()) {
    return `Provide an overview answering: "${query}"\n\nNo relevant sources were found in the indexed data.`;
  }
  return `Based on the following sources, provide a concise overview answering: "${query}"\n\n${contextText}`;
}

function parseUsageFromChunk(chunk: {
  usage?: { inputTokens?: number; outputTokens?: number };
}): OverviewUsage {
  const inputTokens = chunk.usage?.inputTokens ?? 0;
  const outputTokens = chunk.usage?.outputTokens ?? 0;
  return {
    promptTokens: inputTokens,
    completionTokens: outputTokens,
    totalTokens: inputTokens + outputTokens,
  };
}

type StreamGenerationResult = {
  content: string;
  usage: OverviewUsage;
};

type StreamGenerationOptions = {
  userMessage: string;
  modelId: string;
  temperature: number;
  timing: OverviewTiming;
  startTime: number;
};

async function* streamLLMGenerationWithContent(
  options: StreamGenerationOptions
): AsyncGenerator<OverviewStreamChunk, StreamGenerationResult> {
  const { userMessage, modelId, temperature, timing, startTime } = options;
  let usage = createEmptyUsage();
  let firstToken = true;
  let collectedContent = "";

  for await (const chunk of streamCompletion(
    [{ role: "user", content: userMessage }],
    {
      systemPrompt: SYSTEM_PROMPT,
      providerId: OVERVIEW_PROVIDER_ID,
      modelId,
      temperature,
      enableThinking: true,
    }
  )) {
    if (chunk.type === "thinking") {
      yield { type: "thinking", thinkingMessage: chunk.content };
    } else if (chunk.type === "text") {
      if (firstToken) {
        timing.firstTokenMs = performance.now() - startTime;
        firstToken = false;
      }
      collectedContent += chunk.content;
      yield { type: "text", content: chunk.content };
    } else if (chunk.type === "done" && chunk.usage) {
      usage = parseUsageFromChunk(chunk);
    }
  }

  return { content: collectedContent, usage };
}

type StreamCacheResult =
  | {
      hit: true;
      queryEmbedding: number[];
      entry: {
        response: {
          citations: unknown[];
          answer: string;
          groundingScore: number | null;
        };
      };
      similarity: number;
    }
  | {
      hit: false;
      queryEmbedding: number[] | undefined;
    };

async function checkStreamingCache(
  request: OverviewRequest,
  config: OverviewConfig,
  timing: OverviewTiming,
  cacheCheckStart: number
): Promise<StreamCacheResult> {
  if (!config.enableSemanticCache) {
    return { hit: false, queryEmbedding: undefined };
  }

  try {
    const queryEmbedding = await embedQueryWithCache(request.query);
    const semanticCache = getSemanticCache();
    const cached = await semanticCache.findSimilar(
      request.teamId,
      queryEmbedding,
      config.semanticCacheThreshold
    );

    timing.cacheCheckMs = performance.now() - cacheCheckStart;

    if (cached) {
      logger.info(
        {
          teamId: request.teamId,
          similarity: cached.similarity,
          queryLength: request.query.length,
        },
        "Semantic cache hit (streaming)"
      );
      return {
        hit: true,
        queryEmbedding,
        entry: cached.entry,
        similarity: cached.similarity,
      };
    }

    return { hit: false, queryEmbedding };
  } catch (error) {
    logger.warn(
      { error },
      "Semantic cache check failed, proceeding without cache"
    );
    timing.cacheCheckMs = performance.now() - cacheCheckStart;
    return { hit: false, queryEmbedding: undefined };
  }
}

interface CacheHitResponseParams {
  entry: {
    response: {
      citations: unknown[];
      answer: string;
      groundingScore: number | null;
    };
  };
  similarity: number;
  request: OverviewRequest;
  timing: OverviewTiming;
  startTime: number;
}

function* yieldCacheHitResponse(
  params: CacheHitResponseParams
): Generator<OverviewStreamChunk> {
  const { entry, similarity, request, timing, startTime } = params;

  for (const citation of entry.response.citations as OverviewCitation[]) {
    yield { type: "citation", citation };
  }

  const cacheTiming = { ...timing, totalMs: performance.now() - startTime };
  const complexity = analyzeQueryComplexity(request.query);
  getOverviewMetricsCollector().record({
    latencyMs: cacheTiming.totalMs,
    semanticCacheHit: true,
    embeddingCacheHits: 0,
    searchCacheHits: 0,
    modelUsed: "cached",
    teamId: request.teamId,
    complexity,
  });

  yield { type: "text", content: entry.response.answer };
  yield {
    type: "done",
    usage: createEmptyUsage(),
    timing: cacheTiming,
    groundingScore: entry.response.groundingScore ?? undefined,
    fromCache: true,
    cacheSimilarity: similarity,
  };
}

interface StreamGenerationParams {
  request: OverviewRequest;
  config: OverviewConfig;
  timing: OverviewTiming;
  startTime: number;
  queryEmbedding: number[] | undefined;
  documents: GenericDocument[];
  scores: Map<string, number>;
  searchCacheHits: number;
}

async function* streamGenerationPhase(
  params: StreamGenerationParams
): AsyncGenerator<OverviewStreamChunk> {
  const {
    request,
    config,
    timing,
    startTime,
    queryEmbedding,
    documents,
    scores,
    searchCacheHits,
  } = params;

  const { contextDocs, citationMap } = processContext(
    documents,
    scores,
    config,
    timing
  );

  for (const citation of citationMap.values()) {
    yield { type: "citation", citation };
  }

  const generationStart = performance.now();
  const contextText = formatCitationPrompt(contextDocs);
  const userMessage = buildUserMessage(request.query, contextText);
  const { modelId } = selectModel(request, config);
  const temperature = request.temperature ?? 0.3;

  let content = "";
  let usage = createEmptyUsage();

  const generator = streamLLMGenerationWithContent({
    userMessage,
    modelId,
    temperature,
    timing,
    startTime,
  });

  let iteratorResult = await generator.next();
  while (!iteratorResult.done) {
    const chunk = iteratorResult.value;
    yield chunk;
    if (chunk.type === "text" && chunk.content) {
      content += chunk.content;
    }
    iteratorResult = await generator.next();
  }

  usage = iteratorResult.value.usage;

  timing.generationMs = performance.now() - generationStart;
  timing.totalMs = performance.now() - startTime;

  const groundingScore = calculateGroundingScore(content, citationMap);
  const citations = Array.from(citationMap.values());

  await storeInSemanticCache({
    request,
    queryEmbedding,
    content,
    citations,
    groundingScore,
  });

  const complexity = analyzeQueryComplexity(request.query);
  getOverviewMetricsCollector().record({
    latencyMs: timing.totalMs,
    semanticCacheHit: false,
    embeddingCacheHits: 0,
    searchCacheHits,
    modelUsed: modelId,
    teamId: request.teamId,
    complexity,
  });

  yield {
    type: "done",
    usage,
    timing,
    groundingScore,
    fromCache: false,
    modelUsed: modelId,
  };
}

export async function* streamOverview(
  request: OverviewRequest
): AsyncGenerator<OverviewStreamChunk> {
  const startTime = performance.now();
  const timing = createEmptyTiming();
  const config = createStreamConfig(request);

  yield { type: "thinking" };

  const cacheCheckStart = performance.now();
  const cacheResult = await checkStreamingCache(
    request,
    config,
    timing,
    cacheCheckStart
  );

  if (cacheResult.hit && cacheResult.entry.response.answer) {
    yield* yieldCacheHitResponse({
      entry: cacheResult.entry,
      similarity: cacheResult.similarity,
      request,
      timing,
      startTime,
    });
    return;
  }

  let documents: GenericDocument[];
  let scores: Map<string, number>;
  let searchCacheHits = 0;

  try {
    const result = await retrieveDocuments(request, config, timing);
    documents = result.documents;
    scores = result.scores;
    searchCacheHits = result.searchCacheHits;
  } catch (error) {
    logger.error({ error, query: request.query }, "Overview retrieval failed");
    const message =
      error instanceof Error ? error.message : "Failed to retrieve documents";
    yield { type: "error", error: message };
    return;
  }

  if (documents.length === 0) {
    yield {
      type: "text",
      content:
        "I couldn't find relevant information to answer your query. Please try rephrasing your question.",
    };
    yield {
      type: "done",
      usage: createEmptyUsage(),
      timing: { ...timing, totalMs: performance.now() - startTime },
    };
    return;
  }

  try {
    yield* streamGenerationPhase({
      request,
      config,
      timing,
      startTime,
      queryEmbedding: cacheResult.queryEmbedding,
      documents,
      scores,
      searchCacheHits,
    });
  } catch (error) {
    logger.error({ error, query: request.query }, "Overview generation failed");
    const message =
      error instanceof Error ? error.message : "Failed to generate overview";
    yield { type: "error", error: message };
  }
}

export class OverviewOrchestrator {
  private readonly config: OverviewConfig;

  constructor(config: Partial<OverviewConfig> = {}) {
    this.config = { ...DEFAULT_OVERVIEW_CONFIG, ...config };
  }

  generate(request: OverviewRequest): Promise<OverviewResponse> {
    return generateOverview({
      ...request,
      maxSources: request.maxSources ?? this.config.maxSources,
      enableFanout: request.enableFanout ?? this.config.enableFanout,
    });
  }

  async *stream(request: OverviewRequest): AsyncGenerator<OverviewStreamChunk> {
    for await (const chunk of streamOverview({
      ...request,
      maxSources: request.maxSources ?? this.config.maxSources,
      enableFanout: request.enableFanout ?? this.config.enableFanout,
    })) {
      yield chunk;
    }
  }
}

export function createOverviewOrchestrator(
  config?: Partial<OverviewConfig>
): OverviewOrchestrator {
  return new OverviewOrchestrator(config);
}
