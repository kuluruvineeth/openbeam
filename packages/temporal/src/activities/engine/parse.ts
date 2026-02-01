import {
  DEFAULT_CPU_URL,
  type EngineActivityDependencies,
  fetchWithTimeout,
} from "./shared";
import type { ParseInput, ParseResult } from "./types";

interface EngineParseResponse {
  filename: string;
  mime_type: string | null;
  elements: Array<{
    type: string;
    text: string;
    metadata?: Record<string, unknown>;
    page_number?: number;
  }>;
  chunks?:
    | Array<{
        index: number;
        text: string;
        metadata: Record<string, unknown>;
      }>
    | string[];
  metadata: Record<string, unknown>;
  text_length: number;
  page_count: number | null;
}

export function createParseActivity(deps: EngineActivityDependencies = {}) {
  const cpuUrl = deps.cpuServiceUrl ?? DEFAULT_CPU_URL;

  return async function parse(input: ParseInput): Promise<ParseResult> {
    const response = await fetchWithTimeout<EngineParseResponse>(
      `${cpuUrl}/v1/parse`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: input.url,
          filename: input.filename,
          strategy: input.strategy ?? "auto",
        }),
      },
      300_000
    );

    return {
      filename: response.filename,
      mimeType: response.mime_type,
      elements: response.elements.map((el) => ({
        type: el.type,
        text: el.text,
        metadata: el.metadata,
        pageNumber: el.page_number,
      })),
      chunks: response.chunks,
      metadata: response.metadata,
      textLength: response.text_length,
      pageCount: response.page_count,
    };
  };
}
