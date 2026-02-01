import {
  DEFAULT_GPU_URL,
  type EngineActivityDependencies,
  fetchWithTimeout,
} from "./shared";
import type { RerankInput, RerankResult } from "./types";

interface EngineRerankResponse {
  results: Array<{
    index: number;
    score: number;
    passage: string;
  }>;
  model: string;
  usage: {
    latency_ms: number;
  };
}

export function createRerankActivity(deps: EngineActivityDependencies = {}) {
  const gpuUrl = deps.gpuServiceUrl ?? DEFAULT_GPU_URL;

  return async function rerank(input: RerankInput): Promise<RerankResult> {
    const response = await fetchWithTimeout<EngineRerankResponse>(
      `${gpuUrl}/v1/rerank`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: input.query,
          passages: input.passages,
          top_k: input.topK ?? input.passages.length,
        }),
      },
      30_000
    );

    return {
      results: response.results,
      model: response.model,
      usage: {
        latencyMs: response.usage.latency_ms,
      },
    };
  };
}
