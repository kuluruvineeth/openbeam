import {
  type ExecutionDataRef,
  ExecutionDataRefSchema,
} from "@openplane/types/canvas";

export interface ClaimCheckMetadata {
  nodeId?: string;
  contentType?: string;
  sizeBytes?: number;
}

export interface ClaimCheckStore {
  put: (
    payload: unknown,
    metadata?: ClaimCheckMetadata
  ) => Promise<ExecutionDataRef>;
  get: (ref: ExecutionDataRef) => Promise<unknown>;
}

export interface ClaimCheckOptions {
  maxInlineBytes?: number;
}

export type ClaimCheckValue = ExecutionDataRef | unknown;

export function isExecutionDataRef(value: unknown): value is ExecutionDataRef {
  return ExecutionDataRefSchema.safeParse(value).success;
}

export function estimatePayloadSize(value: unknown): number {
  const serialized = JSON.stringify(value);
  if (!serialized) {
    return 0;
  }

  return new TextEncoder().encode(serialized).length;
}
