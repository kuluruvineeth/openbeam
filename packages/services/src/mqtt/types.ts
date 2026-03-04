export interface MqttConnectorErrorOptions {
  message: string;
  code: string;
  retryable?: boolean;
  retryAfter?: number;
}

export class MqttConnectorError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly retryAfter?: number;

  constructor(options: MqttConnectorErrorOptions) {
    super(options.message);
    this.name = "MqttConnectorError";
    this.code = options.code;
    this.retryable = options.retryable ?? false;
    this.retryAfter = options.retryAfter;
  }

  static isConnectionError(code: string): boolean {
    return code === "CONNECTION_FAILED" || code === "CONNECTION_LOST";
  }

  static isAuthError(code: string): boolean {
    return code === "UNAUTHORIZED" || code === "FORBIDDEN";
  }
}
