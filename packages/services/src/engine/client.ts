import {
  type ChunkOptions,
  type ChunkResponse,
  type EngineClientOptions,
  EngineError,
  type HealthResponse,
  type ParseOptions,
  type ParseResponse,
  type SupportedTypesResponse,
} from "./types";

const DEFAULT_TIMEOUT = 30_000; // 30 seconds
const PARSE_TIMEOUT = 180_000; // 3 minutes for file parsing
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof EngineError) {
    return (
      error.code === "TIMEOUT" || error.status === 503 || error.status === 502
    );
  }
  return false;
}

export class EngineClient {
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor(baseUrl: string, options: EngineClientOptions = {}) {
    this.baseUrl = baseUrl;
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
  }

  private async fetchWithTimeout(
    url: string,
    init?: RequestInit,
    customTimeout?: number
  ): Promise<Response> {
    const timeout = customTimeout ?? this.timeout;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });
      return response;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new EngineError(
          `Request timed out after ${timeout}ms`,
          undefined,
          "TIMEOUT"
        );
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async health(): Promise<HealthResponse> {
    const response = await this.fetchWithTimeout(`${this.baseUrl}/v1/health`);
    if (!response.ok) {
      throw new EngineError("Health check failed", response.status);
    }
    return response.json() as Promise<HealthResponse>;
  }

  async getSupportedTypes(): Promise<SupportedTypesResponse> {
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/v1/supported-types`
    );
    if (!response.ok) {
      throw new EngineError("Failed to get supported types", response.status);
    }
    return response.json() as Promise<SupportedTypesResponse>;
  }

  async parseFile(
    file: Buffer | Uint8Array,
    filename: string,
    options: ParseOptions = {}
  ): Promise<ParseResponse> {
    const formData = new FormData();
    formData.append("file", new Blob([file]), filename);

    const params = new URLSearchParams();
    if (options.chunk !== undefined) {
      params.set("chunk", String(options.chunk));
    }
    if (options.maxChunkSize !== undefined) {
      params.set("max_chunk_size", String(options.maxChunkSize));
    }
    if (options.overlap !== undefined) {
      params.set("overlap", String(options.overlap));
    }
    if (options.strategy !== undefined) {
      params.set("strategy", options.strategy);
    }

    const parseEndpoint = `${this.baseUrl}/v1/parse${params.toString() ? `?${params}` : ""}`;
    const response = await this.fetchWithTimeout(
      parseEndpoint,
      {
        method: "POST",
        body: formData,
      },
      PARSE_TIMEOUT
    );

    if (!response.ok) {
      const error = await response.text();
      throw new EngineError(`Parse failed: ${error}`, response.status);
    }

    return response.json() as Promise<ParseResponse>;
  }

  async parseUrl(
    url: string,
    filename?: string,
    options: ParseOptions = {}
  ): Promise<ParseResponse> {
    const params = new URLSearchParams();
    if (options.chunk !== undefined) {
      params.set("chunk", String(options.chunk));
    }
    if (options.maxChunkSize !== undefined) {
      params.set("max_chunk_size", String(options.maxChunkSize));
    }
    if (options.overlap !== undefined) {
      params.set("overlap", String(options.overlap));
    }
    if (options.strategy !== undefined) {
      params.set("strategy", options.strategy);
    }

    const endpoint = `${this.baseUrl}/v1/parse/url${params.toString() ? `?${params}` : ""}`;

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await this.fetchWithTimeout(
          endpoint,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url, filename, strategy: options.strategy }),
          },
          PARSE_TIMEOUT
        );

        if (!response.ok) {
          const error = await response.text();
          throw new EngineError(`Parse URL failed: ${error}`, response.status);
        }

        return response.json() as Promise<ParseResponse>;
      } catch (error) {
        lastError = error as Error;

        if (attempt < MAX_RETRIES && isRetryableError(error)) {
          const delay = RETRY_DELAY_MS * 2 ** attempt;
          await sleep(delay);
          continue;
        }

        throw error;
      }
    }

    throw lastError ?? new EngineError("Parse URL failed after retries");
  }

  async chunkText(
    text: string,
    options: ChunkOptions = {}
  ): Promise<ChunkResponse> {
    const response = await this.fetchWithTimeout(`${this.baseUrl}/v1/chunk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        max_characters: options.maxCharacters ?? 1500,
        overlap: options.overlap ?? 150,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new EngineError(`Chunk failed: ${error}`, response.status);
    }

    return response.json() as Promise<ChunkResponse>;
  }
}
