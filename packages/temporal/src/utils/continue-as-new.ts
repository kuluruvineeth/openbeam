import { workflowInfo } from "@temporalio/workflow";

export interface ContinueAsNewConfig {
  maxHistoryLength?: number;
  maxHistorySize?: number;
}

const DEFAULT_MAX_HISTORY_LENGTH = 10_000;
const DEFAULT_MAX_HISTORY_SIZE = 50 * 1024 * 1024;

export function shouldContinueAsNew(config: ContinueAsNewConfig = {}): boolean {
  const info = workflowInfo();
  const maxLength = config.maxHistoryLength ?? DEFAULT_MAX_HISTORY_LENGTH;
  const maxSize = config.maxHistorySize ?? DEFAULT_MAX_HISTORY_SIZE;

  if (info.historyLength > maxLength) {
    return true;
  }

  if (info.historySize > maxSize) {
    return true;
  }

  return false;
}

export function getHistoryMetrics(): {
  length: number;
  size: number;
  utilizationPercent: number;
} {
  const info = workflowInfo();

  const lengthUtil = (info.historyLength / DEFAULT_MAX_HISTORY_LENGTH) * 100;
  const sizeUtil = (info.historySize / DEFAULT_MAX_HISTORY_SIZE) * 100;

  return {
    length: info.historyLength,
    size: info.historySize,
    utilizationPercent: Math.max(lengthUtil, sizeUtil),
  };
}

export interface ContinueAsNewState<TCursor> {
  cursor: TCursor;
  processed: number;
  indexed: number;
  errors: number;
  continuationCount: number;
}

export function prepareContinueAsNewState<TCursor>(
  currentState: {
    cursor?: TCursor;
    processed: number;
    indexed: number;
    errors: number;
  },
  continuationCount: number
): ContinueAsNewState<TCursor | undefined> {
  return {
    cursor: currentState.cursor,
    processed: currentState.processed,
    indexed: currentState.indexed,
    errors: currentState.errors,
    continuationCount: continuationCount + 1,
  };
}
