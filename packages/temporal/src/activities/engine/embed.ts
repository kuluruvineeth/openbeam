import {
  DEFAULT_CPU_URL,
  type EngineActivityDependencies,
  fetchWithTimeout,
} from "./shared";
import type {
  EmbeddingInput,
  EmbeddingResult,
  SingleEmbeddingInput,
  SingleEmbeddingResult,
} from "./types";

export function createEmbedActivity(deps: EngineActivityDependencies = {}) {
  const serviceUrl = deps.cpuServiceUrl ?? DEFAULT_CPU_URL;

  return async function generateEmbeddings(
    input: EmbeddingInput
  ): Promise<EmbeddingResult> {
    const response = await fetchWithTimeout<{
      embeddings: Array<{ dense: number[]; sparse?: Record<string, number> }>;
    }>(
      `${serviceUrl}/v1/embeddings/batch`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          texts: input.texts,
          mode: "document",
          max_length: input.maxLength ?? 8192,
        }),
      },
      60_000
    );

    return {
      embeddings: response.embeddings.map((e) => e.dense),
      sparseEmbeddings: input.returnSparse
        ? response.embeddings.map((e) => e.sparse || {})
        : undefined,
      model: "bge-m3",
      usage: {
        totalTokens: input.texts.reduce((sum, text) => sum + text.length, 0),
        latencyMs: 0,
      },
    };
  };
}

export function createSingleEmbedActivity(
  deps: EngineActivityDependencies = {}
) {
  const serviceUrl = deps.cpuServiceUrl ?? DEFAULT_CPU_URL;

  return async function generateSingleEmbedding(
    input: SingleEmbeddingInput
  ): Promise<SingleEmbeddingResult> {
    const response = await fetchWithTimeout<{
      dense: number[];
      sparse?: Record<string, number>;
    }>(
      `${serviceUrl}/v1/embeddings/${input.returnSparse ? "document" : "query"}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: input.text,
          max_length: input.maxLength ?? 8192,
        }),
      },
      30_000
    );

    return {
      dense: response.dense,
      sparse: response.sparse,
    };
  };
}
