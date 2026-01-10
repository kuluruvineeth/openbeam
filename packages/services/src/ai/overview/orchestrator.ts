import { streamCompletion } from "@openplane/ai";
import type { GenericDocument, MediaDocument } from "@openplane/vespa";
import { logger } from "../../lib/logger";
import { searchService } from "../../search/service";
import {
  buildCitationMap,
  calculateGroundingScore,
  extractCitationsRealtime,
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
  type OverviewResponse,
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

const SYSTEM_PROMPT = `You are an AI assistant providing concise, accurate overviews based on search results.

Your task is to synthesize information from the provided sources into a clear, helpful overview.

Guidelines:
- Be concise and direct. Front-load the most important information.
- Use inline citations like [1], [2] to reference sources.
- Every factual claim must be supported by a citation.
- If sources conflict, present both perspectives with citations.
- Do not make claims not supported by the provided sources.
- Use markdown formatting for readability (bullet points, bold for emphasis).
- Keep the response focused on answering the user's query.
- Aim for 2-4 paragraphs unless the topic requires more detail.

Format your response as a well-structured overview with citations.`;

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

async function retrieveDocuments(
  request: OverviewRequest,
  config: OverviewConfig,
  timing: OverviewTiming
): Promise<{ documents: GenericDocument[]; scores: Map<string, number> }> {
  const fanoutStart = performance.now();
  const queries = config.enableFanout
    ? generateFanoutQueries(request.query, config.fanoutQueries)
    : [{ query: request.query, intent: "original" as const, weight: 1.0 }];
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

  const { documents, scores } = await retrieveDocuments(
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
  const userMessage = `Based on the following sources, provide a concise overview answering: "${request.query}"\n\n${contextText}`;

  let content = "";
  let usage = createEmptyUsage();

  for await (const chunk of streamCompletion(
    [{ role: "user", content: userMessage }],
    {
      systemPrompt: SYSTEM_PROMPT,
      providerId: OVERVIEW_PROVIDER_ID,
      modelId: request.modelId ?? OVERVIEW_MODEL_ID,
      temperature: request.temperature ?? 0.3,
    }
  )) {
    if (chunk.type === "text") {
      content += chunk.content;
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
  timing.totalMs = performance.now() - startTime;

  const { newCitations } = extractCitationsRealtime(
    content,
    citationMap,
    new Set()
  );
  const groundingScore = calculateGroundingScore(content, citationMap);

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
    }
  )) {
    if (chunk.type === "text") {
      if (firstToken) {
        timing.firstTokenMs = performance.now() - startTime;
        firstToken = false;
      }
      collectedContent += chunk.content;
      yield { type: "text", content: chunk.content };
    }

    if (chunk.type === "done" && chunk.usage) {
      usage = parseUsageFromChunk(chunk);
    }
  }

  return { content: collectedContent, usage };
}

export async function* streamOverview(
  request: OverviewRequest
): AsyncGenerator<OverviewStreamChunk> {
  const startTime = performance.now();
  const timing = createEmptyTiming();
  const config = createStreamConfig(request);

  yield { type: "thinking" };

  let documents: GenericDocument[];
  let scores: Map<string, number>;

  try {
    const result = await retrieveDocuments(request, config, timing);
    documents = result.documents;
    scores = result.scores;
  } catch (error) {
    logger.error({ error, query: request.query }, "Overview retrieval failed");
    const message =
      error instanceof Error ? error.message : "Failed to retrieve documents";
    yield { type: "error", error: message };
    return;
  }

  if (documents.length === 0) {
    const noResultsMessage =
      "I couldn't find relevant information to answer your query. Please try rephrasing your question.";
    yield { type: "text", content: noResultsMessage };
    yield {
      type: "done",
      usage: createEmptyUsage(),
      timing: { ...timing, totalMs: performance.now() - startTime },
    };
    return;
  }

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
  const modelId = request.modelId ?? OVERVIEW_MODEL_ID;
  const temperature = request.temperature ?? 0.3;

  let content = "";
  let usage = createEmptyUsage();

  try {
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
  } catch (error) {
    logger.error({ error, query: request.query }, "Overview generation failed");
    const message =
      error instanceof Error ? error.message : "Failed to generate overview";
    yield { type: "error", error: message };
    return;
  }

  timing.generationMs = performance.now() - generationStart;
  timing.totalMs = performance.now() - startTime;

  const groundingScore = calculateGroundingScore(content, citationMap);

  yield {
    type: "done",
    usage,
    timing,
    groundingScore,
  };
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
