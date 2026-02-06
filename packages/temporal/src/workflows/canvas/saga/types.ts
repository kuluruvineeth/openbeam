import type { ExecutionStatus } from "@openplane/types/canvas";

export interface SagaStepDefinition<TInput = unknown, TOutput = unknown> {
  name: string;
  execute: (input: TInput) => Promise<TOutput>;
  compensate: (input: TInput, output: TOutput) => Promise<void>;
  retryable?: boolean;
}

export interface CompletedSagaStep<TInput = unknown, TOutput = unknown> {
  name: string;
  input: TInput;
  output: TOutput;
  executedAt: number;
  latencyMs: number;
}

export interface SagaExecutionState {
  completedSteps: CompletedSagaStep[];
  status: SagaStatus;
  startedAt: number;
  completedAt?: number;
  error?: string;
  rolledBack: boolean;
}

export type SagaStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "rolling_back"
  | "rolled_back";

export interface SagaExecutionResult<T = unknown> {
  success: boolean;
  output?: T;
  error?: string;
  state: SagaExecutionState;
}

export interface SagaConfig {
  onStepComplete?: (step: CompletedSagaStep) => void | Promise<void>;
  onStepError?: (stepName: string, error: unknown) => void | Promise<void>;
  onRollbackStart?: (steps: CompletedSagaStep[]) => void | Promise<void>;
  onRollbackComplete?: (
    steps: CompletedSagaStep[],
    success: boolean
  ) => void | Promise<void>;
}

export interface CanvasCompensationContext {
  executionId: string;
  teamId: string;
}

export interface CreateStepCompensation {
  stepId: string;
  nodeId: string;
  executionId: string;
  teamId: string;
}

export interface UpdateExecutionCompensation {
  executionId: string;
  teamId: string;
  previousStatus: ExecutionStatus;
  previousNodeId?: string | null;
}

export interface StoreOutputCompensation {
  executionId: string;
  teamId: string;
  nodeId: string;
  dataId?: string;
}
