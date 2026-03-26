export class CustomPullApiError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly retryable: boolean;
  readonly retryAfter?: number;

  constructor(params: {
    message: string;
    statusCode: number;
    code: string;
    retryable: boolean;
    retryAfter?: number;
  }) {
    super(params.message);
    this.name = "CustomPullApiError";
    this.statusCode = params.statusCode;
    this.code = params.code;
    this.retryable = params.retryable;
    this.retryAfter = params.retryAfter;
  }
}

export class FieldMappingError extends Error {
  readonly sourcePath: string;
  readonly targetField: string;

  constructor(params: {
    message: string;
    sourcePath: string;
    targetField: string;
  }) {
    super(params.message);
    this.name = "FieldMappingError";
    this.sourcePath = params.sourcePath;
    this.targetField = params.targetField;
  }
}

export class PaginationError extends Error {
  readonly strategy: string;

  constructor(params: { message: string; strategy: string }) {
    super(params.message);
    this.name = "PaginationError";
    this.strategy = params.strategy;
  }
}
