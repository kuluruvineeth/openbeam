import {
  DEFAULT_CPU_URL,
  type EngineActivityDependencies,
  fetchWithTimeout,
} from "./shared";
import type { ChunkInput, ChunkResult } from "./types";

interface EngineChunkResponse {
  chunks: Array<{
    index: number;
    text: string;
    metadata: Record<string, unknown>;
    page_number?: number;
    page_end?: number;
  }>;
  total_chunks: number;
  total_characters: number;
}

export function createChunkActivity(deps: EngineActivityDependencies = {}) {
  const cpuUrl = deps.cpuServiceUrl ?? DEFAULT_CPU_URL;

  return async function chunk(input: ChunkInput): Promise<ChunkResult> {
    const response = await fetchWithTimeout<EngineChunkResponse>(
      `${cpuUrl}/v1/chunk`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: input.text,
          max_characters: input.maxCharacters ?? 1000,
          overlap: input.overlap ?? 200,
        }),
      }
    );

    return {
      chunks: response.chunks.map((c) => ({
        index: c.index,
        text: c.text,
        metadata: c.metadata,
        pageNumber: c.page_number,
        pageEnd: c.page_end,
      })),
      totalChunks: response.total_chunks,
      totalCharacters: response.total_characters,
    };
  };
}
