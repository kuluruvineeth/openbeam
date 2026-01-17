import { z } from "zod";

export const ErrorCodeSchema = z.enum([
  "RATE_LIMITED",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "TIMEOUT",
  "INVALID_INPUT",
  "INVALID_STATE",
  "PROVIDER_ERROR",
  "QUOTA_EXCEEDED",
  "NETWORK_ERROR",
  "INTERNAL_ERROR",
]);

export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export interface ApiError {
  code: ErrorCode;
  message: string;
  retryable: boolean;
  details?: Record<string, unknown>;
}

export const ToolCategorySchema = z.enum([
  "search",
  "rag",
  "documents",
  "connectors",
  "data",
  "media",
  "browser",
  "action",
  "analysis",
  "integration",
  "system",
  "skills",
  "canvas",
]);

export type ToolCategory = z.infer<typeof ToolCategorySchema>;
