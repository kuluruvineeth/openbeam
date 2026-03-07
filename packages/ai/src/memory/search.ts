import type { PersistentMemorySearchOptions } from "@openbeam/types/ai";
import type {
  EmbeddingProvider,
  VectorSearchResult,
  VectorStore,
} from "./long-term";

const WHITESPACE_PATTERN = /\s+/;
const DEFAULT_SEMANTIC_WEIGHT = 0.7;
const DEFAULT_CANDIDATE_MULTIPLIER = 4;
const DEFAULT_MAX_RESULTS = 10;
const DEFAULT_MIN_RELEVANCE = 0.3;

export interface HybridSearchConfig {
  semanticWeight?: number;
  candidateMultiplier?: number;
}

export interface HybridSearchDeps {
  embeddingProvider: EmbeddingProvider;
  vectorStore: VectorStore;
}

export interface HybridSearchResult {
  id: string;
  content: string;
  score: number;
  matchType: "semantic" | "keyword" | "hybrid";
  metadata: Record<string, unknown>;
}

export async function hybridSearch(
  deps: HybridSearchDeps,
  options: PersistentMemorySearchOptions,
  config?: HybridSearchConfig
): Promise<HybridSearchResult[]> {
  const semanticWeight =
    config?.semanticWeight ?? options.semanticWeight ?? DEFAULT_SEMANTIC_WEIGHT;
  const keywordWeight = 1 - semanticWeight;
  const candidateMultiplier =
    config?.candidateMultiplier ?? DEFAULT_CANDIDATE_MULTIPLIER;
  const limit = options.limit ?? DEFAULT_MAX_RESULTS;
  const minRelevance = options.minRelevance ?? DEFAULT_MIN_RELEVANCE;
  const candidateCount = limit * candidateMultiplier;

  let vectorResults: VectorSearchResult[] = [];
  let vectorAvailable = true;

  try {
    const queryEmbedding = await deps.embeddingProvider.embed(options.query);
    vectorResults = await deps.vectorStore.search(
      queryEmbedding,
      candidateCount,
      { teamId: options.teamId }
    );
  } catch {
    vectorAvailable = false;
  }

  const queryTerms = extractQueryTerms(options.query);
  const candidateMap = new Map<string, HybridSearchCandidate>();

  for (const vr of vectorResults) {
    candidateMap.set(vr.id, {
      id: vr.id,
      metadata: vr.metadata,
      vectorScore: Math.max(0, vr.score),
      keywordScore: 0,
    });
  }

  for (const [_id, candidate] of candidateMap) {
    const content = candidate.metadata.content;
    if (typeof content === "string") {
      candidate.keywordScore = computeKeywordScore(content, queryTerms);
    }
  }

  const results: HybridSearchResult[] = [];

  for (const candidate of candidateMap.values()) {
    const entry = candidate.metadata;

    if (options.tags?.length) {
      const rawTags = entry.tags;
      const tags: string[] = parseTags(rawTags);
      const hasMatch = options.tags.some((t: string) => tags.includes(t));
      if (!hasMatch) {
        continue;
      }
    }

    if (options.dateRange) {
      const createdAt = entry.createdAt as number | undefined;
      if (createdAt) {
        if (options.dateRange.start && createdAt < options.dateRange.start) {
          continue;
        }
        if (options.dateRange.end && createdAt > options.dateRange.end) {
          continue;
        }
      }
    }

    const finalScore = vectorAvailable
      ? semanticWeight * candidate.vectorScore +
        keywordWeight * candidate.keywordScore
      : candidate.keywordScore;

    if (finalScore < minRelevance) {
      continue;
    }

    const matchType = determineMatchType(
      candidate.vectorScore,
      candidate.keywordScore,
      vectorAvailable
    );

    results.push({
      id: candidate.id,
      content: (entry.content as string) ?? "",
      score: finalScore,
      matchType,
      metadata: entry,
    });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

export function computeKeywordScore(
  content: string,
  queryTerms: string[]
): number {
  if (queryTerms.length === 0) {
    return 0;
  }

  const contentLower = content.toLowerCase();
  let matches = 0;

  for (const term of queryTerms) {
    if (contentLower.includes(term)) {
      matches += 1;
    }
  }

  return matches / queryTerms.length;
}

export function extractQueryTerms(query: string): string[] {
  return query
    .toLowerCase()
    .split(WHITESPACE_PATTERN)
    .filter((term) => term.length > 2);
}

function parseTags(rawTags: unknown): string[] {
  if (typeof rawTags === "string") {
    try {
      return JSON.parse(rawTags) as string[];
    } catch {
      return [];
    }
  }
  if (Array.isArray(rawTags)) {
    return rawTags as string[];
  }
  return [];
}

function determineMatchType(
  vectorScore: number,
  keywordScore: number,
  vectorAvailable: boolean
): "semantic" | "keyword" | "hybrid" {
  if (!vectorAvailable) {
    return "keyword";
  }

  const diff = Math.abs(vectorScore - keywordScore);
  if (diff < 0.1) {
    return "hybrid";
  }

  return vectorScore > keywordScore ? "semantic" : "keyword";
}

interface HybridSearchCandidate {
  id: string;
  metadata: Record<string, unknown>;
  vectorScore: number;
  keywordScore: number;
}
