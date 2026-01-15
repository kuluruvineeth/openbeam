export const NOTION_API_BASE = "https://api.notion.com/v1";
export const NOTION_API_VERSION = "2022-06-28";

export const NotionErrorCodes = {
  RATE_LIMITED: "rate_limited",
  UNAUTHORIZED: "unauthorized",
  FORBIDDEN: "forbidden",
  NOT_FOUND: "object_not_found",
  VALIDATION_ERROR: "validation_error",
  CONFLICT: "conflict_error",
  INTERNAL_ERROR: "internal_server_error",
  SERVICE_UNAVAILABLE: "service_unavailable",
} as const;

export type NotionErrorCode =
  (typeof NotionErrorCodes)[keyof typeof NotionErrorCodes];

export interface NotionApiErrorOptions {
  message: string;
  code: string;
  retryable?: boolean;
  retryAfter?: number;
  statusCode?: number;
}

export class NotionApiError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly retryAfter?: number;
  readonly statusCode?: number;

  constructor(options: NotionApiErrorOptions) {
    super(options.message);
    this.name = "NotionApiError";
    this.code = options.code;
    this.retryable = options.retryable ?? false;
    this.retryAfter = options.retryAfter;
    this.statusCode = options.statusCode;
  }

  static fromResponse(
    statusCode: number,
    errorBody: { code?: string; message?: string }
  ): NotionApiError {
    const message = errorBody.message ?? `Notion API error: ${statusCode}`;
    const code = errorBody.code ?? "unknown";

    const retryableCodes = [429, 500, 502, 503, 504];
    const retryable = retryableCodes.includes(statusCode);

    return new NotionApiError({ message, code, retryable, statusCode });
  }

  static isAuthError(code: string): boolean {
    return (
      code === NotionErrorCodes.UNAUTHORIZED ||
      code === NotionErrorCodes.FORBIDDEN
    );
  }

  static isRateLimitError(code: string): boolean {
    return code === NotionErrorCodes.RATE_LIMITED;
  }
}
