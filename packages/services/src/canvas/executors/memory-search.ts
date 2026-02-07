import { EmbeddingService } from "@openplane/ai";
import {
  type MemorySearchMode,
  MemorySearchNodeConfigSchema,
} from "@openplane/types/canvas";
import { rerankerService } from "../../search/reranking/service";
import { CanvasNodeExecutionError } from "../errors";
import { listMemoryEntries, type StoredMemoryEntry } from "../memory-store";
import { resolveNodeConfig } from "../node-config";
import type { CanvasNodeExecutor } from "../types";

const embeddingService = new EmbeddingService();
const DEFAULT_HYBRID_SEMANTIC_WEIGHT = 0.6;

type ScoreDetails = {
  keywordScore?: number;
  semanticScore?: number;
  combinedScore: number;
  rerankScore?: number;
};

type ScoredEntry = {
  id: string;
  entry: StoredMemoryEntry;
  scores: ScoreDetails;
};

type RerankableEntry = ScoredEntry & { rerankRank?: number };

function normalizeQuery(query: string): string {
  return query.trim();
}

function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

function buildSearchText(entry: StoredMemoryEntry): string {
  return [
    entry.key,
    entry.namespace ?? "",
    entry.content,
    ...(entry.tags ?? []),
  ]
    .filter((value) => value.trim())
    .join(" ");
}

function computeKeywordScore(query: string, content: string): number {
  const tokens = tokenize(query);
  if (tokens.length === 0) {
    return 0;
  }
  const haystack = content.toLowerCase();
  let matches = 0;
  for (const token of tokens) {
    if (haystack.includes(token)) {
      matches += 1;
    }
  }
  return matches / tokens.length;
}

function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  if (len === 0) {
    return 0;
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let index = 0; index < len; index += 1) {
    const av = a[index] ?? 0;
    const bv = b[index] ?? 0;
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }
  if (normA === 0 || normB === 0) {
    return 0;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function normalizeSimilarity(score: number): number {
  const normalized = (score + 1) / 2;
  if (normalized < 0) {
    return 0;
  }
  if (normalized > 1) {
    return 1;
  }
  return normalized;
}

function parseTimestamp(value?: string): number | undefined {
  if (!value) {
    return;
  }
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    throw new Error(`Invalid date value: ${value}`);
  }
  return timestamp;
}

function normalizeTags(tags?: string[]): string[] {
  return (tags ?? []).map((tag) => tag.trim()).filter(Boolean);
}

function passesTagFilter(entry: StoredMemoryEntry, tags: string[]): boolean {
  if (tags.length === 0) {
    return true;
  }
  const entryTags = new Set(entry.tags ?? []);
  return tags.every((tag) => entryTags.has(tag));
}

function combineScores(params: {
  mode: MemorySearchMode;
  keywordScore?: number;
  semanticScore?: number;
}): number {
  const keywordScore = params.keywordScore ?? 0;
  const semanticScore = params.semanticScore ?? 0;

  switch (params.mode) {
    case "keyword":
      return keywordScore;
    case "semantic":
      return semanticScore;
    case "hybrid": {
      const keywordWeight = 1 - DEFAULT_HYBRID_SEMANTIC_WEIGHT;
      if (params.semanticScore === undefined) {
        return keywordScore;
      }
      if (params.keywordScore === undefined) {
        return semanticScore;
      }
      return (
        semanticScore * DEFAULT_HYBRID_SEMANTIC_WEIGHT +
        keywordScore * keywordWeight
      );
    }
    default:
      return Math.max(keywordScore, semanticScore);
  }
}

function buildEntryId(entry: StoredMemoryEntry, index: number): string {
  if (entry.memoryId) {
    return `memory:${entry.memoryId}`;
  }
  return `${entry.scope}:${entry.namespace ?? ""}:${entry.key}:${index}`;
}

function formatResultEntry(params: {
  entry: StoredMemoryEntry;
  scores: ScoreDetails;
  includeMetadata: boolean;
}): Record<string, unknown> {
  const base: Record<string, unknown> = {
    key: params.entry.key,
    namespace: params.entry.namespace,
    scope: params.entry.scope,
    memoryType: params.entry.memoryType,
    encoding: params.entry.encoding,
    content: params.entry.content,
    value: params.entry.value,
    score: params.scores.combinedScore,
    scores: {
      keyword: params.scores.keywordScore,
      semantic: params.scores.semanticScore,
      rerank: params.scores.rerankScore,
      combined: params.scores.combinedScore,
    },
  };

  if (!params.includeMetadata) {
    return base;
  }

  return {
    ...base,
    metadata: params.entry.metadata,
    tags: params.entry.tags,
    embedding: params.entry.embedding,
    createdAt: params.entry.createdAt,
    expiresAt: params.entry.expiresAt,
    memoryId: params.entry.memoryId,
  };
}

export const memorySearchExecutor: CanvasNodeExecutor = async ({
  node,
  context,
}) => {
  try {
    const config = MemorySearchNodeConfigSchema.parse(
      resolveNodeConfig(node.data)
    );
    const query = normalizeQuery(config.query);
    if (!query) {
      throw new Error("Memory search query is required");
    }
    if (!context) {
      throw new Error("Execution context is required");
    }

    const startedAt = performance.now();
    const entries = listMemoryEntries({
      scope: config.scope,
      namespace: config.namespace,
      context,
    });

    const requiredTags = normalizeTags(config.tags);
    const startTimestamp = parseTimestamp(config.dateRange?.start);
    const endTimestamp = parseTimestamp(config.dateRange?.end);
    const targetTypes = new Set(config.memoryTypes ?? []);

    const filtered = entries.filter((entry) => {
      if (targetTypes.size > 0 && !targetTypes.has(entry.memoryType)) {
        return false;
      }
      if (!passesTagFilter(entry, requiredTags)) {
        return false;
      }
      if (startTimestamp !== undefined && entry.createdAt < startTimestamp) {
        return false;
      }
      if (endTimestamp !== undefined && entry.createdAt > endTimestamp) {
        return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      return {
        query,
        scope: config.scope,
        namespace: config.namespace,
        searchMode: config.searchMode,
        results: [],
        total: 0,
        returned: 0,
        queryTimeMs: performance.now() - startedAt,
      };
    }

    const useSemantic =
      config.searchMode === "semantic" || config.searchMode === "hybrid";
    const useKeyword =
      config.searchMode === "keyword" || config.searchMode === "hybrid";

    const queryEmbedding = useSemantic
      ? (await embeddingService.embed(query)).embedding
      : undefined;

    const scoredEntries: ScoredEntry[] = [];
    for (const [index, entry] of filtered.entries()) {
      const searchText = buildSearchText(entry);
      const keywordScore = useKeyword
        ? computeKeywordScore(query, searchText)
        : undefined;
      let semanticScore: number | undefined;

      if (useSemantic && queryEmbedding && queryEmbedding.length > 0) {
        let embedding = entry.embedding;
        if (!embedding || embedding.length === 0) {
          const embeddingResult = await embeddingService.embed(entry.content);
          embedding = embeddingResult.embedding;
          entry.embedding = embedding;
        }
        if (embedding && embedding.length > 0) {
          semanticScore = normalizeSimilarity(
            cosineSimilarity(queryEmbedding, embedding)
          );
        }
      }

      const combinedScore = combineScores({
        mode: config.searchMode,
        keywordScore,
        semanticScore,
      });

      scoredEntries.push({
        id: buildEntryId(entry, index),
        entry,
        scores: { keywordScore, semanticScore, combinedScore },
      });
    }

    const threshold = config.threshold;
    const matches = scoredEntries.filter((entry) =>
      threshold !== undefined ? entry.scores.combinedScore >= threshold : true
    );

    matches.sort((a, b) => b.scores.combinedScore - a.scores.combinedScore);

    const total = matches.length;
    const limit = config.topK ?? 10;
    let selected = matches.slice(0, limit);

    if (config.rerank) {
      const rerankDocs = selected.map((entry) => ({
        id: entry.id,
        content: entry.entry.content,
      }));
      const rerankResult = await rerankerService.rerank(
        query,
        rerankDocs,
        limit
      );
      if (rerankResult) {
        const rankById = new Map(
          rerankResult.results.map((result, index) => [
            result.id,
            { score: result.score, rank: index },
          ])
        );
        const reranked: RerankableEntry[] = selected.map((entry) => {
          const rerankInfo = rankById.get(entry.id);
          return {
            ...entry,
            scores: {
              ...entry.scores,
              rerankScore: rerankInfo?.score,
            },
            rerankRank: rerankInfo?.rank,
          };
        });
        reranked.sort((a, b) => {
          if (a.rerankRank === undefined && b.rerankRank === undefined) {
            return b.scores.combinedScore - a.scores.combinedScore;
          }
          if (a.rerankRank === undefined) {
            return 1;
          }
          if (b.rerankRank === undefined) {
            return -1;
          }
          return a.rerankRank - b.rerankRank;
        });
        selected = reranked.map(({ rerankRank, ...rest }) => rest);
      }
    }

    return {
      query,
      scope: config.scope,
      namespace: config.namespace,
      searchMode: config.searchMode,
      results: selected.map((entry) =>
        formatResultEntry({
          entry: entry.entry,
          scores: entry.scores,
          includeMetadata: config.includeMetadata ?? true,
        })
      ),
      total,
      returned: selected.length,
      queryTimeMs: performance.now() - startedAt,
    };
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
