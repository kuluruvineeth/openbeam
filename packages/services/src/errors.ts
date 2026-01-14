import { z } from "zod";

export const ConnectorErrorCode = z.enum([
  "AUTH_EXPIRED",
  "AUTH_INVALID",
  "RATE_LIMITED",
  "API_ERROR",
  "NETWORK_ERROR",
  "NOT_FOUND",
  "PERMISSION_DENIED",
  "SYNC_CONFLICT",
  "INVALID_CURSOR",
  "WEBHOOK_INVALID",
  "CONFIG_ERROR",
]);

type ConnectorErrorCodeType = z.infer<typeof ConnectorErrorCode>;

const RETRYABLE_ERRORS = new Set<ConnectorErrorCodeType>([
  "RATE_LIMITED",
  "NETWORK_ERROR",
  "API_ERROR",
]);

const RETRY_AFTER_REGEX = /retry.after[:\s]+(\d+)/i;

export interface ConnectorErrorOptions {
  retryAfterMs?: number;
  connectorId?: string;
  cause?: Error;
  metadata?: Record<string, unknown>;
}

export class ConnectorError extends Error {
  readonly code: ConnectorErrorCodeType;
  readonly retryable: boolean;
  readonly retryAfterMs?: number;
  readonly connectorId?: string;
  readonly metadata?: Record<string, unknown>;

  constructor(
    code: ConnectorErrorCodeType,
    message: string,
    options?: ConnectorErrorOptions
  ) {
    super(message, { cause: options?.cause });
    this.name = "ConnectorError";
    this.code = code;
    this.retryable = RETRYABLE_ERRORS.has(code);
    this.retryAfterMs = options?.retryAfterMs;
    this.connectorId = options?.connectorId;
    this.metadata = options?.metadata;
  }

  static authExpired(
    message = "Authentication expired",
    options?: Omit<ConnectorErrorOptions, "cause">
  ): ConnectorError {
    return new ConnectorError("AUTH_EXPIRED", message, options);
  }

  static rateLimited(
    retryAfterMs?: number,
    options?: Omit<ConnectorErrorOptions, "retryAfterMs">
  ): ConnectorError {
    return new ConnectorError("RATE_LIMITED", "Rate limit exceeded", {
      ...options,
      retryAfterMs,
    });
  }

  static notFound(
    resource: string,
    options?: ConnectorErrorOptions
  ): ConnectorError {
    return new ConnectorError(
      "NOT_FOUND",
      `Resource not found: ${resource}`,
      options
    );
  }

  static permissionDenied(
    message = "Permission denied",
    options?: ConnectorErrorOptions
  ): ConnectorError {
    return new ConnectorError("PERMISSION_DENIED", message, options);
  }

  static apiError(
    message: string,
    options?: ConnectorErrorOptions
  ): ConnectorError {
    return new ConnectorError("API_ERROR", message, options);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      retryable: this.retryable,
      retryAfterMs: this.retryAfterMs,
      connectorId: this.connectorId,
      metadata: this.metadata,
    };
  }
}

function classifyErrorByMessage(
  message: string,
  error: Error,
  connectorId?: string
): ConnectorError | null {
  if (message.includes("401") || message.includes("unauthorized")) {
    return ConnectorError.authExpired("Authentication expired", {
      connectorId,
    });
  }
  if (message.includes("403") || message.includes("forbidden")) {
    return ConnectorError.permissionDenied("Permission denied", {
      connectorId,
    });
  }
  if (message.includes("429") || message.includes("rate")) {
    return ConnectorError.rateLimited(extractRetryAfterMs(error), {
      connectorId,
    });
  }
  if (message.includes("404") || message.includes("not found")) {
    return ConnectorError.notFound("resource", { connectorId });
  }
  return null;
}

function classifyNetworkError(
  message: string,
  error: Error,
  connectorId?: string
): ConnectorError | null {
  if (message.includes("timeout") || message.includes("etimedout")) {
    return new ConnectorError("NETWORK_ERROR", "Request timed out", {
      connectorId,
      cause: error,
    });
  }
  if (message.includes("econnrefused") || message.includes("econnreset")) {
    return new ConnectorError("NETWORK_ERROR", "Connection failed", {
      connectorId,
      cause: error,
    });
  }
  return null;
}

export function normalizeApiError(
  error: unknown,
  connectorId?: string
): ConnectorError {
  if (error instanceof ConnectorError) {
    return error;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    const httpError = classifyErrorByMessage(message, error, connectorId);
    if (httpError) {
      return httpError;
    }
    const networkError = classifyNetworkError(message, error, connectorId);
    if (networkError) {
      return networkError;
    }
  }

  return ConnectorError.apiError(
    error instanceof Error ? error.message : "Unknown API error",
    { connectorId, cause: error instanceof Error ? error : undefined }
  );
}

function extractRetryAfterMs(error: Error): number | undefined {
  const match = error.message.match(RETRY_AFTER_REGEX);
  if (match?.[1]) {
    const seconds = Number.parseInt(match[1], 10);
    return seconds * 1000;
  }
  return;
}

export function isRetryableError(error: unknown): boolean {
  if (error instanceof ConnectorError) {
    return error.retryable;
  }
  return false;
}

export function getRetryDelayMs(error: unknown, defaultMs = 5000): number {
  if (error instanceof ConnectorError && error.retryAfterMs) {
    return error.retryAfterMs;
  }
  return defaultMs;
}
