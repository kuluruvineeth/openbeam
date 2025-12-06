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

export class EngineClient {
  private readonly timeout: number;

  constructor(
    private readonly baseUrl: string,
    options: EngineClientOptions = {}
  ) {
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
  }

  private async fetch(url: string, init?: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });
      return response;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new EngineError(
          `Request timed out after ${this.timeout}ms`,
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
    const response = await this.fetch(`${this.baseUrl}/health`);
    if (!response.ok) {
      throw new EngineError("Health check failed", response.status);
    }
    return response.json() as Promise<HealthResponse>;
  }

  async getSupportedTypes(): Promise<SupportedTypesResponse> {
    const response = await this.fetch(`${this.baseUrl}/supported-types`);
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

    const url = `${this.baseUrl}/parse${params.toString() ? `?${params}` : ""}`;
    const response = await this.fetch(url, {
      method: "POST",
      body: formData,
    });

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

    const endpoint = `${this.baseUrl}/parse/url${params.toString() ? `?${params}` : ""}`;
    const response = await this.fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, filename }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new EngineError(`Parse URL failed: ${error}`, response.status);
    }

    return response.json() as Promise<ParseResponse>;
  }

  async chunkText(
    text: string,
    options: ChunkOptions = {}
  ): Promise<ChunkResponse> {
    const response = await this.fetch(`${this.baseUrl}/chunk`, {
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
