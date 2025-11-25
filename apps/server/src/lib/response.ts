/**
 * Response Utilities - Standardized API responses
 * Ensures consistent response format across all endpoints
 */

import type { Context } from "hono";
import type {
  ApiResponse,
  ErrorResponse,
  PaginatedResponse,
  PaginationMeta,
  ResponseMeta,
} from "@/types/api";

// ============================================================================
// Response Builders
// ============================================================================

/**
 * Create a successful API response
 */
export function success<T>(
  c: Context,
  data: T,
  status: 200 | 201 = 200
): Response {
  const startTime = c.get("requestStartTime") as number | undefined;
  const requestId = c.get("requestId") as string | undefined;

  const response: ApiResponse<T> = {
    success: true,
    data,
    meta: createMeta(requestId, startTime),
  };

  return c.json(response, status);
}

/**
 * Create a paginated API response
 */
export function paginated<T>(
  c: Context,
  data: T[],
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  }
): Response {
  const startTime = c.get("requestStartTime") as number | undefined;
  const requestId = c.get("requestId") as string | undefined;

  const totalPages = Math.ceil(pagination.total / pagination.pageSize);

  const response: PaginatedResponse<T> = {
    success: true,
    data,
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total: pagination.total,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrevious: pagination.page > 1,
    },
    meta: createMeta(requestId, startTime),
  };

  return c.json(response, 200);
}

/**
 * Error options for creating error responses
 */
export interface ErrorOptions {
  code: string;
  message: string;
  status?: 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500 | 502 | 503;
  details?: Record<string, unknown>;
}

/**
 * Create an error response
 */
export function error(c: Context, options: ErrorOptions): Response {
  const { code, message, status = 400, details } = options;
  const requestId = c.get("requestId") as string | undefined;

  const response: ErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
      ...(requestId && { requestId }),
    },
  };

  return c.json(response, status);
}

// ============================================================================
// Error Helpers
// ============================================================================

export function badRequest(
  c: Context,
  message: string,
  details?: Record<string, unknown>
): Response {
  return error(c, { code: "BAD_REQUEST", message, status: 400, details });
}

export function unauthorized(c: Context, message = "Unauthorized"): Response {
  return error(c, { code: "UNAUTHORIZED", message, status: 401 });
}

export function forbidden(
  c: Context,
  message = "Forbidden",
  details?: Record<string, unknown>
): Response {
  return error(c, { code: "FORBIDDEN", message, status: 403, details });
}

export function notFound(
  c: Context,
  resource = "Resource",
  id?: string
): Response {
  const message = id
    ? `${resource} '${id}' not found`
    : `${resource} not found`;
  return error(c, { code: "NOT_FOUND", message, status: 404 });
}

export function conflict(
  c: Context,
  message: string,
  details?: Record<string, unknown>
): Response {
  return error(c, { code: "CONFLICT", message, status: 409, details });
}

export function validationError(
  c: Context,
  message: string,
  details?: Record<string, unknown>
): Response {
  return error(c, { code: "VALIDATION_ERROR", message, status: 422, details });
}

export function rateLimited(
  c: Context,
  retryAfter?: number,
  limit?: number
): Response {
  return error(c, {
    code: "RATE_LIMITED",
    message: "Too many requests. Please try again later.",
    status: 429,
    details: {
      ...(retryAfter && { retryAfter }),
      ...(limit && { limit }),
    },
  });
}

export function internalError(
  c: Context,
  message = "An unexpected error occurred"
): Response {
  return error(c, { code: "INTERNAL_ERROR", message, status: 500 });
}

export function serviceUnavailable(
  c: Context,
  message = "Service temporarily unavailable"
): Response {
  return error(c, { code: "SERVICE_UNAVAILABLE", message, status: 503 });
}

// ============================================================================
// Utilities
// ============================================================================

function createMeta(
  requestId?: string,
  startTime?: number
): ResponseMeta | undefined {
  if (!requestId) {
    return;
  }

  return {
    requestId,
    timestamp: new Date().toISOString(),
    processingTimeMs: startTime ? Date.now() - startTime : 0,
  };
}

/**
 * Calculate pagination from limit/offset to page/pageSize
 */
export function toPagination(
  limit: number,
  offset: number,
  total: number
): PaginationMeta {
  const pageSize = limit;
  const page = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / pageSize);

  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrevious: page > 1,
  };
}

/**
 * Convert page/pageSize to limit/offset
 */
export function toOffset(page: number, pageSize: number): number {
  return (page - 1) * pageSize;
}
