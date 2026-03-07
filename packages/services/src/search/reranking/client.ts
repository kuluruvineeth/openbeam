import { getConfig } from "@openbeam/ai";
import type { RerankDocument, RerankResponse, RerankStats } from "./types";

interface EngineRerankRequest {
  query: string;
  documents: Array<{
    id: string;
    content: string;
    title?: string;
    score?: number;
    rank?: number;
  }>;
  top_k: number;
}

interface EngineRerankResponse {
  results: Array<{
    id: string;
    score: number;
    original_score: number | null;
    original_rank: number | null;
  }>;
  elapsed_ms: number;
  model: string;
}

interface EngineStatsResponse {
  model: string;
  device: string;
  cache: {
    memory_hits: number;
    redis_hits: number;
    misses: number;
    total: number;
    hit_rate: number;
    memory_size: number;
  };
}

const RERANK_TIMEOUT_MS = 120_000;

export async function callRerank(
  query: string,
  documents: RerankDocument[],
  topK: number
): Promise<RerankResponse> {
  const config = getConfig();
  const { baseURL } = config.engine;

  const body: EngineRerankRequest = {
    query,
    documents: documents.map((doc) => ({
      id: doc.id,
      content: doc.content,
      title: doc.title,
      score: doc.score,
      rank: doc.rank,
    })),
    top_k: topK,
  };

  const response = await fetch(`${baseURL}/v1/rerank`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(RERANK_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Rerank failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as EngineRerankResponse;

  return {
    results: data.results.map((r) => ({
      id: r.id,
      score: r.score,
      originalScore: r.original_score,
      originalRank: r.original_rank,
    })),
    elapsedMs: data.elapsed_ms,
    model: data.model,
  };
}

export async function getRerankStats(): Promise<RerankStats> {
  const config = getConfig();
  const { baseURL } = config.engine;

  const response = await fetch(`${baseURL}/v1/rerank/stats`, {
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error(`Rerank stats failed: ${response.status}`);
  }

  const data = (await response.json()) as EngineStatsResponse;

  return {
    model: data.model,
    device: data.device,
    cache: {
      memoryHits: data.cache.memory_hits,
      redisHits: data.cache.redis_hits,
      misses: data.cache.misses,
      total: data.cache.total,
      hitRate: data.cache.hit_rate,
      memorySize: data.cache.memory_size,
    },
  };
}
