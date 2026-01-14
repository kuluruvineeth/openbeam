export interface BatchFailure {
  documentId: string;
  error: string;
  retryable: boolean;
}

export interface BatchResult {
  succeeded: string[];
  failed: BatchFailure[];
  totalProcessed: number;
  successRate: number;
}

const RETRYABLE_ERROR_PATTERNS = [
  "ECONNREFUSED",
  "ETIMEDOUT",
  "ECONNRESET",
  "EPIPE",
  "network",
  "timeout",
  "503",
  "429",
  "rate limit",
] as const;

export function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message.toLowerCase();
  return RETRYABLE_ERROR_PATTERNS.some((pattern) =>
    message.includes(pattern.toLowerCase())
  );
}

export function createBatchResult(
  succeeded: string[],
  failed: BatchFailure[],
  total: number
): BatchResult {
  return {
    succeeded,
    failed,
    totalProcessed: total,
    successRate: total > 0 ? succeeded.length / total : 0,
  };
}
