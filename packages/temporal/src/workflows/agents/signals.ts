import type { TimeoutTier } from "@openplane/types/temporal/agent-timeouts";
import { defineQuery, defineSignal } from "@temporalio/workflow";

export const extendTimeoutSignal =
  defineSignal<[ExtendTimeoutPayload]>("extendTimeout");

export const agentChainProgressQuery =
  defineQuery<AgentChainProgress>("agentChainProgress");

export interface ExtendTimeoutPayload {
  requestedTier: TimeoutTier;
  reason: string;
  requestedBy: string;
}

export interface AgentChainProgress {
  currentStep: number;
  maxSteps: number;
  currentTier: TimeoutTier;
  chunksCompletedInStep: number;
  totalTokensUsed: number;
  totalCostCents: number;
  elapsedMs: number;
  status:
    | "running"
    | "checkpointing"
    | "waiting_extension"
    | "completed"
    | "cancelled";
  lastHeartbeat: number;
}
