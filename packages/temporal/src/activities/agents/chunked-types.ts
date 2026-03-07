import type {
  AgentHeartbeatPayload,
  ChunkCheckpoint,
} from "@openbeam/types/temporal/agent-heartbeat";
import type { TimeoutTier } from "@openbeam/types/temporal/agent-timeouts";
import type { AgentArtifact, AgentCheckpoint } from "../../workflows/types";

export interface ChunkedAgentExecutor {
  executeChunk(input: ExecuteChunkInput): Promise<ChunkExecutionResult>;
}

export interface ChunkExecutionResult {
  artifacts: AgentArtifact[];
  intermediateState: Record<string, unknown>;
  tokensUsed: number;
  costCents: number;
  complete: boolean;
  needsMoreChunks: boolean;
}

export interface ExecuteAgentStepChunkedInput {
  sessionId: string;
  agentType: string;
  step: number;
  previousArtifacts: AgentArtifact[];
  context: Record<string, unknown>;
  tier: TimeoutTier;
  maxChunks: number;
  checkpointEveryNChunks: number;
  resumeFromChunk: ChunkCheckpoint | null;
}

export interface ExecuteChunkInput {
  sessionId: string;
  agentType: string;
  step: number;
  chunkIndex: number;
  previousOutput: ChunkCheckpoint | null;
  context: Record<string, unknown>;
}

export interface ExecuteAgentStepChunkedOutput {
  artifacts: AgentArtifact[];
  checkpoint: AgentCheckpoint;
  lastChunkCheckpoint: ChunkCheckpoint | null;
  complete: boolean;
  chunksExecuted: number;
  tokensUsed: number;
  costCents: number;
  timedOut: boolean;
}

export interface ExecuteParallelAgentStepsInput {
  sessionId: string;
  agentType: string;
  step: number;
  branches: Array<{
    branchId: string;
    context: Record<string, unknown>;
    previousArtifacts: AgentArtifact[];
  }>;
}

export interface ExecuteParallelAgentStepsOutput {
  branches: Array<{
    branchId: string;
    artifacts: AgentArtifact[];
    tokensUsed: number;
    costCents: number;
    complete: boolean;
  }>;
  totalTokensUsed: number;
  totalCostCents: number;
}

export interface ChunkedAgentActivities {
  executeAgentStepChunked(
    input: ExecuteAgentStepChunkedInput
  ): Promise<ExecuteAgentStepChunkedOutput>;
  executeParallelAgentSteps(
    input: ExecuteParallelAgentStepsInput
  ): Promise<ExecuteParallelAgentStepsOutput>;
}

export type ChunkProgressHeartbeat = AgentHeartbeatPayload & {
  branchId?: string;
  complete?: boolean;
};
