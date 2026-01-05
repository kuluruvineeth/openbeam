import { z } from "zod";

export const DuckDBErrorCodes = {
  SQL_INVALID: "SQL_INVALID",
  SQL_BLOCKED_FUNCTION: "SQL_BLOCKED_FUNCTION",
  SQL_BLOCKED_STATEMENT: "SQL_BLOCKED_STATEMENT",
  SQL_TABLE_NOT_ALLOWED: "SQL_TABLE_NOT_ALLOWED",
  QUERY_TIMEOUT: "QUERY_TIMEOUT",
  MEMORY_EXCEEDED: "MEMORY_EXCEEDED",
  FILE_TOO_LARGE: "FILE_TOO_LARGE",
  ROW_COUNT_EXCEEDED: "ROW_COUNT_EXCEEDED",
  COLUMN_COUNT_EXCEEDED: "COLUMN_COUNT_EXCEEDED",
  CONNECTION_FAILED: "CONNECTION_FAILED",
  STORAGE_ERROR: "STORAGE_ERROR",
  CIRCUIT_OPEN: "CIRCUIT_OPEN",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type DuckDBErrorCode =
  (typeof DuckDBErrorCodes)[keyof typeof DuckDBErrorCodes];

export interface DuckDBApiErrorOptions {
  message: string;
  code: DuckDBErrorCode;
  retryable?: boolean;
  retryAfter?: number;
  details?: Record<string, unknown>;
}

export class DuckDBApiError extends Error {
  readonly code: DuckDBErrorCode;
  readonly retryable: boolean;
  readonly retryAfter?: number;
  readonly details?: Record<string, unknown>;

  constructor(options: DuckDBApiErrorOptions) {
    super(options.message);
    this.name = "DuckDBApiError";
    this.code = options.code;
    this.retryable = options.retryable ?? false;
    this.retryAfter = options.retryAfter;
    this.details = options.details;
  }

  static isRetryable(error: unknown): boolean {
    if (error instanceof DuckDBApiError) {
      return error.retryable;
    }
    return false;
  }

  static isTimeout(error: unknown): boolean {
    if (error instanceof DuckDBApiError) {
      return error.code === DuckDBErrorCodes.QUERY_TIMEOUT;
    }
    return false;
  }

  static isCircuitOpen(error: unknown): boolean {
    if (error instanceof DuckDBApiError) {
      return error.code === DuckDBErrorCodes.CIRCUIT_OPEN;
    }
    return false;
  }
}

export const SpreadsheetColumnSchema = z.object({
  name: z.string(),
  type: z.enum(["string", "number", "date", "boolean", "unknown"]),
  nullable: z.boolean().default(true),
  sampleValues: z.array(z.unknown()).optional(),
});

export type SpreadsheetColumn = z.infer<typeof SpreadsheetColumnSchema>;

export const SpreadsheetSchemaSchema = z.object({
  fileName: z.string(),
  sheets: z.array(z.string()),
  activeSheet: z.string(),
  columns: z.array(SpreadsheetColumnSchema),
  rowCount: z.number(),
  sampleData: z.array(z.record(z.string(), z.unknown())),
});

export type SpreadsheetSchema = z.infer<typeof SpreadsheetSchemaSchema>;

export interface QueryExecutionOptions {
  timeoutMs: number;
  maxResultRows: number;
}

export interface QueryResult {
  rows: Record<string, unknown>[];
  columnTypes: Record<string, string>;
  rowCount: number;
  totalRowsScanned: number;
  executedSql: string;
  latencyMs: number;
}

export interface FileValidationResult {
  valid: boolean;
  reason?: string;
  fileSize?: number;
  rowCount?: number;
  columnCount?: number;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export type CircuitBreakerState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerMetrics {
  state: CircuitBreakerState;
  failures: number;
  successes: number;
  fallbacks: number;
  rejects: number;
}

export interface MetricLabels {
  teamId: string;
  operation: string;
  status: "success" | "error" | "timeout" | "circuit_open";
}

export const SPREADSHEET_MIME_TYPES = [
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.oasis.opendocument.spreadsheet",
  "application/vnd.google-apps.spreadsheet",
] as const;

export type SpreadsheetMimeType = (typeof SPREADSHEET_MIME_TYPES)[number];

export function isSpreadsheetMime(
  mimeType: string | null | undefined
): boolean {
  if (!mimeType) {
    return false;
  }
  return SPREADSHEET_MIME_TYPES.includes(mimeType as SpreadsheetMimeType);
}

export function getSpreadsheetFormat(
  mimeType: string | null | undefined
): "csv" | "xlsx" | "xls" | "ods" | "google" | null {
  if (!mimeType) {
    return null;
  }
  if (mimeType.includes("csv")) {
    return "csv";
  }
  if (mimeType.includes("spreadsheetml")) {
    return "xlsx";
  }
  if (mimeType === "application/vnd.ms-excel") {
    return "xls";
  }
  if (mimeType.includes("opendocument.spreadsheet")) {
    return "ods";
  }
  if (mimeType.includes("google-apps.spreadsheet")) {
    return "google";
  }
  return null;
}
