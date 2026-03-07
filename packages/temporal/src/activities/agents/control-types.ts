import type { AdapterExecutionResult } from "@openbeam/types/control/adapters";

export interface LoadAgentForRunInput {
  teamId: string;
  agentId: string;
}

export interface LoadAgentForRunOutput {
  id: string;
  teamId: string;
  name: string;
  adapterType: string | null;
  adapterConfig: Record<string, unknown>;
  runtimeConfig: Record<string, unknown>;
  status: string;
  budgetMonthlyCents: number;
  spentMonthlyCents: number;
}

export interface ClaimAndStartRunInput {
  teamId: string;
  agentId: string;
  runId: string;
  wakeupRequestId: string;
}

export interface ClaimAndStartRunOutput {
  sessionIdBefore: string | undefined;
}

export interface ExecuteAdapterInput {
  teamId: string;
  agentId: string;
  runId: string;
  adapterType: string;
  adapterConfig: Record<string, unknown>;
  runtimeConfig: Record<string, unknown>;
  agentName: string;
  sessionId: string | undefined;
  sessionParams: Record<string, unknown> | null;
  payload: Record<string, unknown> | undefined;
  reason: string | undefined;
}

export interface ExecuteAdapterOutput {
  exitCode: number | null;
  signal: string | null;
  timedOut: boolean;
  errorMessage: string | null | undefined;
  sessionId: string | null | undefined;
  sessionParams: Record<string, unknown> | null | undefined;
  provider: string | null | undefined;
  model: string | null | undefined;
  costUsd: number | null | undefined;
  resultJson: Record<string, unknown> | null | undefined;
  raw: AdapterExecutionResult;
}

export interface CompleteRunInput {
  teamId: string;
  agentId: string;
  runId: string;
  wakeupRequestId: string;
  result: AdapterExecutionResult;
}

export interface FailRunInput {
  teamId: string;
  agentId: string;
  runId: string;
  wakeupRequestId: string;
  error: string;
  errorCode?: string;
}

export interface UpdateRuntimeStateInput {
  teamId: string;
  agentId: string;
  adapterType: string;
  sessionId?: string;
  stateJson?: unknown;
  lastRunId?: string;
  lastRunStatus?: string;
}

export interface PublishRunEventInput {
  teamId: string;
  agentId: string;
  runId: string;
  type: "run_started" | "run_completed" | "status_changed";
  status?: string;
}

export interface LogActivityInput {
  teamId: string;
  runId: string;
  agentId: string;
  seq: number;
  eventType: string;
  stream?: string;
  level?: string;
  message?: string;
  payload?: Record<string, unknown>;
}

export interface ReapOrphanedRunsInput {
  teamId: string;
  staleThresholdMs?: number;
}

export interface ReapOrphanedRunsOutput {
  checked: number;
  reaped: number;
}

export interface LoadPendingWakeupRequestsInput {
  teamId: string;
  limit?: number;
}

export interface PendingWakeupRequest {
  id: string;
  agentId: string;
  adapterType: string | null;
  adapterConfig: Record<string, unknown>;
  runtimeConfig: Record<string, unknown>;
  payload: Record<string, unknown> | undefined;
  reason: string | undefined;
  source: string;
}

export interface LoadPendingWakeupRequestsOutput {
  requests: PendingWakeupRequest[];
}

export interface LoadAgentTimerConfigOutput {
  enabled: boolean;
  intervalSec: number;
  agentId: string;
  teamId: string;
}

export interface CheckoutIssueInput {
  teamId: string;
  issueId: string;
  runId: string;
  agentNameKey: string;
  expectedStatuses?: string[];
}

export interface ReleaseIssueInput {
  teamId: string;
  issueId: string;
}

export interface EnqueueTimerWakeupInput {
  teamId: string;
  agentId: string;
}

export interface ControlPlaneActivities {
  loadAgentForRun(input: LoadAgentForRunInput): Promise<LoadAgentForRunOutput>;
  claimAndStartRun(
    input: ClaimAndStartRunInput
  ): Promise<ClaimAndStartRunOutput>;
  executeAdapter(input: ExecuteAdapterInput): Promise<ExecuteAdapterOutput>;
  completeRun(input: CompleteRunInput): Promise<void>;
  failRun(input: FailRunInput): Promise<void>;
  updateRuntimeState(input: UpdateRuntimeStateInput): Promise<void>;
  publishRunEvent(input: PublishRunEventInput): Promise<void>;
  logActivity(input: LogActivityInput): Promise<void>;
  reapOrphanedRuns(
    input: ReapOrphanedRunsInput
  ): Promise<ReapOrphanedRunsOutput>;
  loadPendingWakeupRequests(
    input: LoadPendingWakeupRequestsInput
  ): Promise<LoadPendingWakeupRequestsOutput>;
  loadAgentTimerConfig(
    input: LoadAgentForRunInput
  ): Promise<LoadAgentTimerConfigOutput>;
  enqueueTimerWakeup(input: EnqueueTimerWakeupInput): Promise<void>;
  checkoutIssue(input: CheckoutIssueInput): Promise<void>;
  releaseIssue(input: ReleaseIssueInput): Promise<void>;
}
