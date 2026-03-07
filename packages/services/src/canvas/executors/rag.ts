import { completeWithContext, estimateTokens } from "@openbeam/ai";
import type { Citation, CompletionContext } from "@openbeam/types/ai";
import {
  type ExecutionContext,
  type RagExecutionResult,
  RagNodeConfigSchema,
} from "@openbeam/types/canvas";
import type { GenericDocument, MediaDocument } from "@openbeam/vespa";
import {
  extractChunksFromDocuments,
  rerankChunks,
  selectDiverse,
} from "../../ai/rag/chunk-reranker";
import { analyzeQuery } from "../../ai/rag/query-analyzer";
import type { RAGChunk as ServiceRagChunk } from "../../ai/rag/types";
import { searchService } from "../../search/service";
import { CanvasNodeExecutionError } from "../errors";
import { resolveNodeConfig } from "../node-config";
import type { CanvasNodeExecutor } from "../types";

const EMPTY_RESPONSE =
  "I couldn't find any relevant documents to answer your question. Please try rephrasing your query or check if the relevant data has been synced.";
const SEARCH_LIMIT_MULTIPLIER = 2;
const MIN_SEARCH_LIMIT = 1;
const MAX_SEARCH_LIMIT = 100;
const RERANK_LIMIT_MULTIPLIER = 2;
const MIN_RERANK_LIMIT = 1;
const DEFAULT_DEDUPE_THRESHOLD = 0.95;
const SNIPPET_LENGTH = 200;
const NON_WORD = /[^\w\s]+/g;
const MULTI_SPACE = /\s+/g;

type SearchItem = {
  type: "document" | "media";
  relevance: number;
  data: GenericDocument | MediaDocument;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function resolveQuery(input: unknown): string {
  if (typeof input === "string") {
    return input.trim();
  }

  if (isRecord(input)) {
    const direct = input.query;
    if (typeof direct === "string" && direct.trim()) {
      return direct.trim();
    }

    const candidates = [
      input.prompt,
      input.input,
      input.text,
      input.message,
      input.content,
    ];

    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate.trim();
      }
    }

    if (candidates.some((candidate) => candidate !== undefined)) {
      return String(candidates.find((c) => c !== undefined));
    }
  }

  if (input === undefined || input === null) {
    return "";
  }

  return String(input);
}

function expandQueries(query: string, enabled: boolean): string[] {
  if (!enabled) {
    return [query];
  }
  const analysis = analyzeQuery(query);
  const all = [query, ...analysis.subQueries];
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const entry of all) {
    const normalized = entry.trim();
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    unique.push(normalized);
  }
  return unique.length > 0 ? unique : [query];
}

function mergeSearchItems(results: SearchItem[][]): SearchItem[] {
  const merged = new Map<string, SearchItem>();
  for (const items of results) {
    for (const item of items) {
      const id =
        item.type === "document"
          ? (item.data as GenericDocument).id
          : (item.data as MediaDocument).id;
      const key = `${item.type}:${id}`;
      const existing = merged.get(key);
      if (!existing || item.relevance > existing.relevance) {
        merged.set(key, item);
      }
    }
  }
  return Array.from(merged.values()).sort((a, b) => b.relevance - a.relevance);
}

function resolveTeamId(input: unknown, context?: ExecutionContext): string {
  if (context?.teamId) {
    return context.teamId;
  }

  if (isRecord(input)) {
    if (typeof input.teamId === "string" && input.teamId) {
      return input.teamId;
    }

    const ctx = input.context;
    if (isRecord(ctx) && typeof ctx.teamId === "string" && ctx.teamId) {
      return ctx.teamId;
    }

    const toolCtx = input.toolContext;
    if (
      isRecord(toolCtx) &&
      typeof toolCtx.teamId === "string" &&
      toolCtx.teamId
    ) {
      return toolCtx.teamId;
    }
  }

  throw new Error("teamId is required for RAG execution");
}

function resolveAccessControlIds(input: unknown): string[] | undefined {
  if (!isRecord(input)) {
    return;
  }

  const candidates = [input.accessControlIds, input.accessControl];
  for (const candidate of candidates) {
    if (
      Array.isArray(candidate) &&
      candidate.every((id) => typeof id === "string")
    ) {
      return candidate.length > 0 ? candidate : undefined;
    }
  }

  return;
}

function resolveIncludeMedia(input: unknown): boolean {
  if (!isRecord(input)) {
    return true;
  }
  if (typeof input.includeMedia === "boolean") {
    return input.includeMedia;
  }
  return true;
}

function resolveSourceId(input: unknown): string | undefined {
  if (!isRecord(input)) {
    return;
  }
  return typeof input.sourceId === "string" ? input.sourceId : undefined;
}

function mapSearchRanking(searchType?: string): "hybrid" | "semantic" | "bm25" {
  if (searchType === "semantic") {
    return "semantic";
  }
  if (searchType === "keyword") {
    return "bm25";
  }
  return "hybrid";
}

function buildSystemPrompt(
  basePrompt?: string,
  citationStyle?: string
): string | undefined {
  const parts: string[] = [];
  if (basePrompt?.trim()) {
    parts.push(basePrompt.trim());
  }
  if (citationStyle === "none") {
    parts.push("Do not include citations.");
  }
  if (citationStyle === "inline") {
    parts.push("Cite sources inline by mentioning document titles.");
  }
  if (citationStyle === "footnote") {
    parts.push("Cite sources using footnotes with document titles.");
  }
  if (parts.length === 0) {
    return;
  }
  return parts.join("\n\n");
}

function extractMediaContent(media: MediaDocument): string {
  if (media.transcript?.trim()) {
    return media.transcript;
  }
  if (media.media_summary?.trim()) {
    return media.media_summary;
  }
  if (media.description?.trim()) {
    return media.description;
  }
  return "";
}

function buildMediaChunk(
  media: MediaDocument,
  score: number
): ServiceRagChunk | null {
  const content = extractMediaContent(media);
  if (!content.trim()) {
    return null;
  }
  return {
    id: `${media.id}_chunk_0`,
    documentId: media.id,
    documentTitle: media.title || "Untitled",
    documentUrl: media.url ?? undefined,
    connectorType: media.connector_type ?? "media",
    content,
    startOffset: 0,
    endOffset: content.length,
    score,
    tokenCount: estimateTokens(content),
  };
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(NON_WORD, " ")
    .replace(MULTI_SPACE, " ")
    .trim();
}

function buildTokenSet(value: string): Set<string> {
  const normalized = normalizeText(value);
  if (!normalized) {
    return new Set();
  }
  return new Set(normalized.split(" "));
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) {
    return 0;
  }
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) {
      intersection += 1;
    }
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function dedupeChunks(
  chunks: ServiceRagChunk[],
  threshold: number
): ServiceRagChunk[] {
  const seen = new Set<string>();
  const result: ServiceRagChunk[] = [];
  const tokenCache = new Map<string, Set<string>>();
  const normalizedThreshold = Math.min(Math.max(threshold, 0), 1);
  const useFuzzy = normalizedThreshold < 1;

  const getTokens = (chunk: ServiceRagChunk): Set<string> => {
    const cached = tokenCache.get(chunk.id);
    if (cached) {
      return cached;
    }
    const tokens = buildTokenSet(chunk.content);
    tokenCache.set(chunk.id, tokens);
    return tokens;
  };

  for (const chunk of chunks) {
    const key = `${chunk.documentId}:${chunk.content}`;
    if (seen.has(key)) {
      continue;
    }
    if (useFuzzy && result.length > 0) {
      const tokens = getTokens(chunk);
      const isDuplicate = result.some(
        (existing) =>
          jaccardSimilarity(tokens, getTokens(existing)) >= normalizedThreshold
      );
      if (isDuplicate) {
        continue;
      }
    }
    seen.add(key);
    result.push(chunk);
  }

  return result;
}

function buildCitationsFromChunks(chunks: ServiceRagChunk[]): Citation[] {
  const byDocument = new Map<string, Citation>();

  for (const chunk of chunks) {
    if (byDocument.has(chunk.documentId)) {
      continue;
    }
    byDocument.set(chunk.documentId, {
      documentId: chunk.documentId,
      title: chunk.documentTitle,
      url: chunk.documentUrl,
      snippet: chunk.content.slice(0, SNIPPET_LENGTH),
      relevanceScore: chunk.score,
    });
  }

  return Array.from(byDocument.values());
}

function toCanvasChunks(
  chunks: ServiceRagChunk[]
): RagExecutionResult["chunks"] {
  return chunks.map((chunk) => ({
    id: chunk.id,
    content: chunk.content,
    score: chunk.score,
    documentId: chunk.documentId,
    documentTitle: chunk.documentTitle,
    connectorType: chunk.connectorType,
    url: chunk.documentUrl,
  }));
}

function resolveSearchLimit(topK: number): number {
  return Math.min(
    Math.max(topK * SEARCH_LIMIT_MULTIPLIER, MIN_SEARCH_LIMIT),
    MAX_SEARCH_LIMIT
  );
}

function resolveRerankLimit(topK: number): number {
  return Math.max(topK * RERANK_LIMIT_MULTIPLIER, MIN_RERANK_LIMIT);
}

function extractSearchChunks(params: {
  items: SearchItem[];
  minScore: number;
}): {
  documents: GenericDocument[];
  scores: Map<string, number>;
  mediaChunks: ServiceRagChunk[];
} {
  const documents: GenericDocument[] = [];
  const scores = new Map<string, number>();
  const mediaChunks: ServiceRagChunk[] = [];

  for (const item of params.items) {
    if (item.relevance < params.minScore) {
      continue;
    }
    if (item.type === "document") {
      const doc = item.data as GenericDocument;
      documents.push(doc);
      scores.set(doc.id, item.relevance);
      continue;
    }
    const media = item.data as MediaDocument;
    const chunk = buildMediaChunk(media, item.relevance);
    if (chunk) {
      mediaChunks.push(chunk);
    }
  }

  return { documents, scores, mediaChunks };
}

function selectChunks(params: {
  query: string;
  topK: number;
  minScore: number;
  config: {
    chunkOverlap?: number;
    maxChunkSize?: number;
    deduplicate?: boolean;
    dedupeThreshold?: number;
    rerank?: boolean;
    diversityPenalty?: number;
  };
  documents: GenericDocument[];
  scores: Map<string, number>;
  mediaChunks: ServiceRagChunk[];
}): ServiceRagChunk[] {
  const docChunks = extractChunksFromDocuments(
    params.documents,
    params.scores,
    {
      chunkSize: params.config.maxChunkSize,
      chunkOverlap: params.config.chunkOverlap,
    }
  );

  let chunks = [...docChunks, ...params.mediaChunks].filter(
    (chunk) => chunk.score >= params.minScore
  );

  if (params.config.deduplicate ?? true) {
    chunks = dedupeChunks(
      chunks,
      params.config.dedupeThreshold ?? DEFAULT_DEDUPE_THRESHOLD
    );
  }

  if (params.config.rerank ?? true) {
    chunks = rerankChunks(
      params.query,
      chunks,
      resolveRerankLimit(params.topK)
    );
  } else {
    chunks = [...chunks].sort((a, b) => b.score - a.score);
  }

  const diversityWeight = params.config.diversityPenalty ?? 0;

  return diversityWeight > 0
    ? selectDiverse(chunks, params.topK, diversityWeight)
    : chunks.slice(0, params.topK);
}

function buildUsage(params: {
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  embeddingTokens?: number;
}): RagExecutionResult["usage"] {
  return {
    inputTokens: params.inputTokens ?? 0,
    outputTokens: params.outputTokens ?? 0,
    embeddingTokens: params.embeddingTokens ?? 0,
    latencyMs: params.latencyMs,
  };
}

function buildEmptyResult(params: {
  startedAt: number;
  synthesize: boolean;
}): RagExecutionResult {
  const latencyMs = Date.now() - params.startedAt;

  return {
    chunks: [],
    answer: params.synthesize ? EMPTY_RESPONSE : undefined,
    citations: [],
    usage: buildUsage({ latencyMs }),
  };
}

function buildContextResult(params: {
  startedAt: number;
  chunks: ServiceRagChunk[];
}): RagExecutionResult {
  const latencyMs = Date.now() - params.startedAt;

  return {
    chunks: toCanvasChunks(params.chunks),
    citations: buildCitationsFromChunks(params.chunks),
    usage: buildUsage({ latencyMs }),
  };
}

function buildContextDocuments(
  chunks: ServiceRagChunk[]
): CompletionContext["documents"] {
  return chunks.map((chunk) => ({
    id: chunk.id,
    title: chunk.documentTitle,
    content: chunk.content,
    url: chunk.documentUrl,
    source: chunk.connectorType,
    relevanceScore: chunk.score,
  }));
}

async function buildSynthesisResult(params: {
  query: string;
  systemPrompt?: string;
  modelId?: string;
  startedAt: number;
  chunks: ServiceRagChunk[];
}): Promise<RagExecutionResult> {
  const completion = await completeWithContext(
    params.query,
    { documents: buildContextDocuments(params.chunks), query: params.query },
    {
      systemPrompt: params.systemPrompt,
      modelId: params.modelId,
    }
  );

  const citations =
    completion.citations.length > 0
      ? completion.citations
      : buildCitationsFromChunks(params.chunks);

  const latencyMs = Date.now() - params.startedAt;

  return {
    chunks: toCanvasChunks(params.chunks),
    answer: completion.content,
    citations,
    usage: buildUsage({
      latencyMs,
      inputTokens: completion.usage.inputTokens,
      outputTokens: completion.usage.outputTokens,
    }),
  };
}

export const ragExecutor: CanvasNodeExecutor = async ({
  node,
  input,
  context,
}) => {
  const config = RagNodeConfigSchema.parse(resolveNodeConfig(node.data));
  const startedAt = Date.now();

  try {
    const query = resolveQuery(input);
    if (!query) {
      throw new Error("RAG query is required");
    }

    const teamId = resolveTeamId(input, context);
    const accessControlIds = resolveAccessControlIds(input);
    const includeMedia = resolveIncludeMedia(input);
    const sourceId = resolveSourceId(input);
    const topK = config.topK;
    const minScore = config.minScore;
    const ranking = mapSearchRanking(config.searchType);

    const queries = expandQueries(query, config.queryExpansion);
    const searchResults = await Promise.all(
      queries.map((expandedQuery) =>
        searchService.searchUnified({
          query: expandedQuery,
          teamId,
          limit: resolveSearchLimit(topK),
          accessControlIds,
          connectorTypes: config.connectorTypes,
          includeDocuments: true,
          includeMedia,
          sourceId,
          ranking,
          mediaRanking: ranking,
        })
      )
    );
    const mergedItems = mergeSearchItems(
      searchResults.map((result) => result.items as SearchItem[])
    );

    const { documents, scores, mediaChunks } = extractSearchChunks({
      items: mergedItems,
      minScore,
    });
    const selectedChunks = selectChunks({
      query,
      topK,
      minScore,
      config,
      documents,
      scores,
      mediaChunks,
    });

    if (selectedChunks.length === 0) {
      return buildEmptyResult({
        startedAt,
        synthesize: config.synthesize !== false,
      });
    }

    const systemPrompt = buildSystemPrompt(
      config.systemPrompt,
      config.citationStyle
    );

    if (config.synthesize === false) {
      return buildContextResult({ startedAt, chunks: selectedChunks });
    }

    return await buildSynthesisResult({
      query,
      systemPrompt,
      modelId: config.model,
      startedAt,
      chunks: selectedChunks,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    throw new CanvasNodeExecutionError({
      nodeType: node.type,
      nodeId: node.id,
      message,
      cause: error,
    });
  }
};
