import type { Database } from "@openplane/db";
import {
  createAgentCanvasExecutionStep,
  updateAgentCanvasExecutionStep,
} from "@openplane/db";
import type {
  ExecutionDataRef,
  ExecutionPlanNode,
} from "@openplane/types/canvas";
import {
  createDbClaimCheckStore,
  isExecutionDataRef,
  resolvePayload,
  storePayload,
} from "../../../engine/claim-check";

export { isExecutionDataRef };

export type ClaimCheckStore = ReturnType<typeof createDbClaimCheckStore>;

export interface ActivityDependencies {
  db: Database;
  maxInlineBytes?: number;
}

export interface ActivityBaseInput {
  executionId: string;
  teamId: string;
  node: ExecutionPlanNode;
  input?: unknown;
}

export interface ActivityTimingResult {
  startedAt: number;
  completedAt: number;
  latencyMs: number;
}

export interface ActivityOutputResult {
  output?: unknown;
  outputRef?: ExecutionDataRef;
  inputRef?: ExecutionDataRef;
}

export interface ExecutionStepContext {
  stepId: string;
  claimCheck: ClaimCheckStore;
  resolvedInput: unknown;
  storedInput: unknown;
  startedAt: number;
}

export interface StoreOptions {
  maxInlineBytes?: number;
  nodeId: string;
}

export interface CompleteStepParams {
  deps: ActivityDependencies;
  teamId: string;
  stepId: string;
  output: unknown;
  startedAt: number;
}

export interface FailStepParams {
  deps: ActivityDependencies;
  teamId: string;
  stepId: string;
  error: unknown;
  startedAt: number;
}

export function extractErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function resolveInputValue(
  input: unknown,
  claimCheck: ClaimCheckStore
): Promise<unknown> {
  if (isExecutionDataRef(input)) {
    return resolvePayload(input, claimCheck);
  }
  return Promise.resolve(input);
}

export function storeInputValue(
  input: unknown,
  resolvedInput: unknown,
  claimCheck: ClaimCheckStore,
  options: StoreOptions
): Promise<unknown> {
  if (isExecutionDataRef(input)) {
    return Promise.resolve(input);
  }
  return storePayload(
    resolvedInput,
    claimCheck,
    { maxInlineBytes: options.maxInlineBytes },
    { nodeId: options.nodeId }
  );
}

export async function initializeActivityStep(
  deps: ActivityDependencies,
  input: ActivityBaseInput
): Promise<ExecutionStepContext> {
  const startedAt = Date.now();
  const claimCheck = createDbClaimCheckStore(
    deps.db,
    input.executionId,
    input.teamId
  );

  const resolvedInput = await resolveInputValue(input.input, claimCheck);
  const storedInput = await storeInputValue(
    input.input,
    resolvedInput,
    claimCheck,
    { maxInlineBytes: deps.maxInlineBytes, nodeId: input.node.id }
  );

  const step = await createAgentCanvasExecutionStep(deps.db, input.teamId, {
    executionId: input.executionId,
    nodeId: input.node.id,
    nodeType: input.node.type,
    status: "RUNNING",
    input: storedInput,
    startedAt: new Date(startedAt),
  });

  return {
    stepId: step.id,
    claimCheck,
    resolvedInput,
    storedInput,
    startedAt,
  };
}

export async function completeActivityStep(
  params: CompleteStepParams
): Promise<ActivityTimingResult & { storedOutput: unknown }> {
  const { deps, teamId, stepId, output, startedAt } = params;
  const completedAt = Date.now();
  const latencyMs = completedAt - startedAt;

  await updateAgentCanvasExecutionStep(deps.db, stepId, teamId, {
    status: "COMPLETED",
    output,
    latencyMs,
    completedAt: new Date(completedAt),
  });

  return {
    storedOutput: output,
    startedAt,
    completedAt,
    latencyMs,
  };
}

export async function failActivityStep(
  params: FailStepParams
): Promise<ActivityTimingResult> {
  const { deps, teamId, stepId, error, startedAt } = params;
  const completedAt = Date.now();
  const latencyMs = completedAt - startedAt;
  const message = extractErrorMessage(error);

  await updateAgentCanvasExecutionStep(deps.db, stepId, teamId, {
    status: "FAILED",
    error: message,
    latencyMs,
    completedAt: new Date(completedAt),
  });

  return {
    startedAt,
    completedAt,
    latencyMs,
  };
}

export function storeOutputValue(
  value: unknown,
  claimCheck: ClaimCheckStore,
  options: StoreOptions
): Promise<unknown> {
  return storePayload(
    value,
    claimCheck,
    { maxInlineBytes: options.maxInlineBytes },
    { nodeId: options.nodeId }
  );
}

export function buildOutputResult(
  storedOutput: unknown,
  storedInput: unknown
): ActivityOutputResult {
  return {
    output: isExecutionDataRef(storedOutput) ? undefined : storedOutput,
    outputRef: isExecutionDataRef(storedOutput) ? storedOutput : undefined,
    inputRef: isExecutionDataRef(storedInput) ? storedInput : undefined,
  };
}

export function buildTimingResult(
  startedAt: number,
  completedAt: number
): ActivityTimingResult {
  return {
    startedAt,
    completedAt,
    latencyMs: completedAt - startedAt,
  };
}

export async function resolveRefArray<T>(
  refs: ExecutionDataRef[] | undefined,
  claimCheck: ClaimCheckStore
): Promise<T[]> {
  if (!refs || refs.length === 0) {
    return [];
  }
  const results: T[] = [];
  for (const ref of refs) {
    const resolved = await resolvePayload(ref, claimCheck);
    results.push(resolved as T);
  }
  return results;
}

export async function resolveRefOrDefault<T>(
  ref: ExecutionDataRef | undefined,
  claimCheck: ClaimCheckStore,
  defaultValue: T
): Promise<T> {
  if (!ref) {
    return defaultValue;
  }
  const resolved = await resolvePayload(ref, claimCheck);
  return resolved as T;
}

export function storeToRef(
  value: unknown,
  claimCheck: ClaimCheckStore,
  nodeId: string
): Promise<ExecutionDataRef> {
  return claimCheck.put(value, { nodeId }) as Promise<ExecutionDataRef>;
}

export function ensureArray(value: unknown, errorMessage: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(errorMessage);
  }
  return value;
}

export function assertRequiredExpression(
  expression: string | undefined,
  errorMessage: string
): string {
  const trimmed = expression?.trim();
  if (!trimmed) {
    throw new Error(errorMessage);
  }
  return trimmed;
}

export function assertPositiveNumber(
  value: number | undefined,
  errorMessage: string
): void {
  if (value === undefined || value <= 0) {
    throw new Error(errorMessage);
  }
}

export interface CollectedErrors<T> {
  result: unknown;
  errors: T[];
}

export function wrapWithErrors<T>(
  result: unknown,
  errors: T[]
): CollectedErrors<T> {
  return { result, errors };
}

export function shouldCollectErrors(
  errorHandling: string | undefined
): boolean {
  return errorHandling === "collect" || errorHandling === "collectErrors";
}
