export type OpcUaErrorCode =
  | "BROWSE_ERROR"
  | "CONNECTION_FAILED"
  | "READ_ERROR"
  | "SESSION_EXPIRED"
  | "SUBSCRIBE_ERROR"
  | "TIMEOUT";

export interface OpcUaApiErrorOptions {
  message: string;
  code: OpcUaErrorCode;
  retryable?: boolean;
  nodeId?: string;
}

export class OpcUaApiError extends Error {
  readonly code: OpcUaErrorCode;
  readonly retryable: boolean;
  readonly nodeId?: string;

  constructor(options: OpcUaApiErrorOptions) {
    super(options.message);
    this.name = "OpcUaApiError";
    this.code = options.code;
    this.retryable = options.retryable ?? false;
    this.nodeId = options.nodeId;
  }

  static isConnectionError(code: string): boolean {
    return code === "CONNECTION_FAILED" || code === "SESSION_EXPIRED";
  }

  static isRetryable(code: string): boolean {
    return code === "TIMEOUT" || code === "SESSION_EXPIRED";
  }
}
