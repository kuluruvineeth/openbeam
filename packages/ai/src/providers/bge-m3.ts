import { z } from "zod";

const EmbeddingResponseSchema = z.object({
  dense: z.array(z.number()),
  sparse: z.record(z.string(), z.number()).nullable(),
});

const BatchEmbeddingResponseSchema = z.object({
  embeddings: z.array(EmbeddingResponseSchema),
});

export class BGEM3Error extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "BGEM3Error";
    this.status = status;
  }
}

export class BGEM3TimeoutError extends Error {
  readonly timeoutMs: number;

  constructor(timeoutMs: number) {
    super(`BGE-M3 request timed out after ${timeoutMs}ms`);
    this.name = "BGEM3TimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

export interface BGEM3Config {
  baseURL: string;
  timeout?: number;
}

export interface BGEM3EmbeddingResult {
  dense: number[];
  sparse: Record<string, number> | null;
}

export interface BGEM3Provider {
  embedQuery: (
    text: string,
    maxLength?: number
  ) => Promise<BGEM3EmbeddingResult>;
  embedDocument: (
    text: string,
    maxLength?: number
  ) => Promise<BGEM3EmbeddingResult>;
  embedBatch: (
    texts: string[],
    mode?: "query" | "document",
    maxLength?: number
  ) => Promise<BGEM3EmbeddingResult[]>;
}

export function createBGEM3Provider(config: BGEM3Config): BGEM3Provider {
  const timeout = config.timeout ?? 120_000;

  const request = async <T>(
    endpoint: string,
    body: Record<string, unknown>,
    schema: z.ZodType<T>
  ): Promise<T> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${config.baseURL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new BGEM3Error(
          response.status,
          `BGE-M3 request failed: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      return schema.parse(data);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new BGEM3TimeoutError(timeout);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  };

  return {
    embedQuery(text, maxLength = 256) {
      return request(
        "/v1/embeddings/query",
        { text, max_length: maxLength },
        EmbeddingResponseSchema
      );
    },

    embedDocument(text, maxLength = 512) {
      return request(
        "/v1/embeddings/document",
        { text, max_length: maxLength },
        EmbeddingResponseSchema
      );
    },

    async embedBatch(texts, mode, maxLength) {
      const effectiveMode = mode ?? "document";
      const length = maxLength ?? (effectiveMode === "query" ? 256 : 512);
      const response = await request(
        "/v1/embeddings/batch",
        { texts, mode: effectiveMode, max_length: length },
        BatchEmbeddingResponseSchema
      );
      return response.embeddings;
    },
  };
}

let providerInstance: BGEM3Provider | null = null;

export function getBGEM3Provider(): BGEM3Provider {
  if (!providerInstance) {
    const baseURL = process.env.ENGINE_URL ?? "http://localhost:8000";
    const timeout = Number(process.env.ENGINE_TIMEOUT) || 120_000;
    providerInstance = createBGEM3Provider({ baseURL, timeout });
  }
  return providerInstance;
}

export function resetBGEM3Provider(): void {
  providerInstance = null;
}
