import type { MitreAttackErrorCode } from "@openbeam/types/services/connectors/mitre-attack";

interface MitreAttackApiErrorOptions {
  message: string;
  code: MitreAttackErrorCode;
  retryable?: boolean;
  cause?: unknown;
}

export class MitreAttackApiError extends Error {
  readonly code: MitreAttackErrorCode;
  readonly retryable: boolean;

  constructor(options: MitreAttackApiErrorOptions) {
    super(options.message, { cause: options.cause });
    this.name = "MitreAttackApiError";
    this.code = options.code;
    this.retryable = options.retryable ?? false;
  }
}
