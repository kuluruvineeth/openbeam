import {
  AuthenticationError,
  NotFoundError,
  OpenBeamError,
  PermissionError,
  RateLimitError,
  ServerError,
  ToolError,
} from "./errors";
import type {
  McpToolCallRequest,
  McpToolCallResponse,
  OpenBeamConfig,
  RequestOptions,
} from "./types";

const DEFAULT_BASE_URL = "https://api.openbeam.work";
const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_MAX_RETRIES = 2;
const RETRY_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);
const INITIAL_RETRY_DELAY = 500;
const TRAILING_SLASHES = /\/+$/;

export class HttpClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly maxRetries: number;
  private requestId = 0;

  constructor(config: OpenBeamConfig) {
    if (!config.apiKey) {
      throw new AuthenticationError("apiKey is required");
    }
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(
      TRAILING_SLASHES,
      ""
    );
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
  }

  async callTool<T>(
    toolName: string,
    args: Record<string, unknown>,
    options?: RequestOptions
  ): Promise<T> {
    const id = this.nextId();

    const body: McpToolCallRequest = {
      jsonrpc: "2.0",
      id,
      method: "tools/call",
      params: { name: toolName, arguments: args },
    };

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/mcp`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: this.buildSignal(options),
      },
      0
    );

    await this.handleHttpError(response);

    const json = (await response.json()) as McpToolCallResponse;

    if (json.error) {
      throw new OpenBeamError(json.error.message, json.error.code, "mcp_error");
    }

    if (json.result?.isError) {
      const text = json.result.content[0]?.text ?? "Tool execution failed";
      throw new ToolError(text);
    }

    return (json.result?.structuredContent ?? json.result) as T;
  }

  private nextId(): number {
    this.requestId += 1;
    return this.requestId;
  }

  private buildSignal(options?: RequestOptions): AbortSignal {
    const timeout = options?.timeout ?? this.timeout;
    const signals: AbortSignal[] = [AbortSignal.timeout(timeout)];
    if (options?.signal) {
      signals.push(options.signal);
    }
    return AbortSignal.any(signals);
  }

  private async fetchWithRetry(
    url: string,
    init: RequestInit,
    attempt: number
  ): Promise<Response> {
    try {
      const response = await fetch(url, init);

      if (
        RETRY_STATUS_CODES.has(response.status) &&
        attempt < this.maxRetries
      ) {
        const delay = this.retryDelay(attempt, response);
        await sleep(delay);
        return this.fetchWithRetry(url, init, attempt + 1);
      }

      return response;
    } catch (error) {
      if (attempt < this.maxRetries && isRetryableError(error)) {
        const delay = INITIAL_RETRY_DELAY * 2 ** attempt;
        await sleep(delay);
        return this.fetchWithRetry(url, init, attempt + 1);
      }
      throw error;
    }
  }

  private retryDelay(attempt: number, response: Response): number {
    const retryAfter = response.headers.get("Retry-After");
    if (retryAfter) {
      const seconds = Number.parseInt(retryAfter, 10);
      if (!Number.isNaN(seconds)) {
        return seconds * 1000;
      }
    }
    return INITIAL_RETRY_DELAY * 2 ** attempt;
  }

  private async handleHttpError(response: Response): Promise<void> {
    if (response.ok) {
      return;
    }

    let message: string;
    try {
      const body = (await response.json()) as Record<string, unknown>;
      message =
        (body.error_description as string) ??
        (body.error as string) ??
        response.statusText;
    } catch {
      message = response.statusText;
    }

    switch (response.status) {
      case 401:
        throw new AuthenticationError(message);
      case 403:
        throw new PermissionError(message);
      case 404:
        throw new NotFoundError(message);
      case 429: {
        const retryAfter = response.headers.get("Retry-After");
        const seconds = retryAfter ? Number.parseInt(retryAfter, 10) : null;
        throw new RateLimitError(
          message,
          Number.isNaN(seconds) ? null : seconds
        );
      }
      default:
        if (response.status >= 500) {
          throw new ServerError(message);
        }
        throw new OpenBeamError(message, response.status, "api_error");
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.name === "TypeError" ||
      error.message.includes("fetch failed") ||
      error.message.includes("ECONNRESET")
    );
  }
  return false;
}
