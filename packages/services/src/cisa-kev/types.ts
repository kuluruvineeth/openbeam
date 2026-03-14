import type { CisaKevErrorCode } from "@openbeam/types/services/connectors/cisa-kev";

interface CisaKevApiErrorOptions {
  message: string;
  code: CisaKevErrorCode;
  retryable?: boolean;
  cause?: unknown;
}

export class CisaKevApiError extends Error {
  readonly code: CisaKevErrorCode;
  readonly retryable: boolean;

  constructor(options: CisaKevApiErrorOptions) {
    super(options.message, { cause: options.cause });
    this.name = "CisaKevApiError";
    this.code = options.code;
    this.retryable = options.retryable ?? false;
  }
}
