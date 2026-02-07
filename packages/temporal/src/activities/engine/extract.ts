import {
  DEFAULT_GPU_URL,
  type EngineActivityDependencies,
  fetchWithTimeout,
} from "./shared";
import type { ExtractEntitiesInput, ExtractEntitiesResult } from "./types";

interface EngineEntityResponse {
  entities: Array<{
    text: string;
    label: string;
    score: number;
    start: number;
    end: number;
    source: string;
  }>;
  model: string;
  usage: {
    latency_ms: number;
  };
}

export function createExtractEntitiesActivity(
  deps: EngineActivityDependencies = {}
) {
  const gpuUrl = deps.gpuServiceUrl ?? DEFAULT_GPU_URL;

  return async function extractEntities(
    input: ExtractEntitiesInput
  ): Promise<ExtractEntitiesResult> {
    const response = await fetchWithTimeout<EngineEntityResponse>(
      `${gpuUrl}/v1/entities`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: input.text,
          labels: input.labels,
          threshold: input.threshold ?? 0.5,
        }),
      },
      30_000
    );

    return {
      entities: response.entities,
      model: response.model,
      usage: {
        latencyMs: response.usage.latency_ms,
      },
    };
  };
}
