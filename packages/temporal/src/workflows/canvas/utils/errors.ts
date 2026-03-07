import type {
  RetryNodeConfig,
  TryCatchNodeConfig,
} from "@openbeam/types/canvas";
import { ApplicationFailure } from "@temporalio/workflow";
import { CanvasValidationError } from "../../../engine/canvas-compiler";

export const CANVAS_ERROR_TYPES = {
  EXECUTION_PLAN: "CanvasExecutionPlanError",
  VALIDATION: "CanvasValidationError",
  NODE_EXECUTION: "CanvasNodeExecutionError",
  UNSUPPORTED_NODE: "UnsupportedNodeType",
} as const;

export type CanvasErrorType =
  (typeof CANVAS_ERROR_TYPES)[keyof typeof CANVAS_ERROR_TYPES];

export interface FailureDetails {
  type?: string;
  name?: string;
  nonRetryable?: boolean;
}

export type ParallelMapItemResult =
  | { status: "fulfilled"; index: number; item: unknown; output: unknown }
  | { status: "rejected"; index: number; item: unknown; error: string };

export interface ParallelMapTaskDetails {
  error: unknown;
  item: unknown;
  index: number;
  input: Record<string, unknown>;
  startedAt: number;
}

export function unwrapFailure(error: unknown): unknown {
  let current: unknown = error;
  const visited = new Set<unknown>();

  while (
    current &&
    typeof current === "object" &&
    "cause" in current &&
    !visited.has(current)
  ) {
    visited.add(current);
    const next = (current as { cause?: unknown }).cause;
    if (!next) {
      break;
    }
    current = next;
  }

  return current;
}

export function resolveFailureMessage(error: unknown): string {
  const root = unwrapFailure(error);
  if (root instanceof Error) {
    return root.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function resolveFailureDetails(error: unknown): FailureDetails {
  const root = unwrapFailure(error);

  if (root instanceof ApplicationFailure) {
    return {
      type: root.type ?? root.name,
      name: root.name,
      nonRetryable: root.nonRetryable ?? undefined,
    };
  }

  if (error instanceof ApplicationFailure) {
    return {
      type: error.type ?? error.name,
      name: error.name,
      nonRetryable: error.nonRetryable ?? undefined,
    };
  }

  if (root instanceof Error) {
    return { name: root.name };
  }

  if (error instanceof Error) {
    return { name: error.name };
  }

  return {};
}

export function formatPlanError(error: unknown): string {
  if (error instanceof CanvasValidationError) {
    return error.issues.join("; ");
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function shouldRetryFailure(
  error: unknown,
  config: RetryNodeConfig
): boolean {
  const details = resolveFailureDetails(error);
  if (details.type === CANVAS_ERROR_TYPES.UNSUPPORTED_NODE) {
    return false;
  }
  if (details.type === CANVAS_ERROR_TYPES.EXECUTION_PLAN) {
    return false;
  }

  const allowlist = config.retryOnErrors?.filter((value) => value.trim());
  if (allowlist && allowlist.length > 0) {
    if (details.type && allowlist.includes(details.type)) {
      return true;
    }
    if (details.name && allowlist.includes(details.name)) {
      return true;
    }
    return false;
  }

  if (
    details.nonRetryable &&
    details.type !== CANVAS_ERROR_TYPES.NODE_EXECUTION
  ) {
    return false;
  }

  return true;
}

export function shouldCatchFailure(
  error: unknown,
  config: TryCatchNodeConfig
): boolean {
  const details = resolveFailureDetails(error);
  const allowlist = config.catchErrors?.filter((value) => value.trim());

  if (allowlist && allowlist.length > 0) {
    if (details.type && allowlist.includes(details.type)) {
      return true;
    }
    if (details.name && allowlist.includes(details.name)) {
      return true;
    }
    return !config.rethrowUnhandled;
  }

  return true;
}

export class ParallelMapTaskError extends Error {
  readonly details: ParallelMapTaskDetails;

  constructor(details: ParallelMapTaskDetails) {
    super(resolveFailureMessage(details.error));
    this.name = "ParallelMapTaskError";
    this.details = details;
  }
}

export function isNonRetryableError(error: unknown): boolean {
  const details = resolveFailureDetails(error);
  return details.nonRetryable === true;
}

export function createExecutionPlanError(message: string): ApplicationFailure {
  return ApplicationFailure.nonRetryable(
    message,
    CANVAS_ERROR_TYPES.EXECUTION_PLAN
  );
}

export function createValidationError(message: string): ApplicationFailure {
  return ApplicationFailure.nonRetryable(
    message,
    CANVAS_ERROR_TYPES.VALIDATION
  );
}
