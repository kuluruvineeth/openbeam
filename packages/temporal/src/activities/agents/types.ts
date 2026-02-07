import type { AgentArtifact, AgentCheckpoint } from "../../workflows/types";

export interface AgentExecutor {
  executeStep(
    sessionId: string,
    agentType: string,
    step: number,
    previousArtifacts: AgentArtifact[],
    context: Record<string, unknown>
  ): Promise<{
    artifacts: AgentArtifact[];
    complete: boolean;
    tokensUsed?: number;
    costCents?: number;
  }>;
}

export interface ExecuteAgentStepInput {
  sessionId: string;
  agentType: string;
  step: number;
  previousArtifacts: AgentArtifact[];
  context: Record<string, unknown>;
}

export interface ExecuteAgentStepOutput {
  artifacts: AgentArtifact[];
  checkpoint: AgentCheckpoint;
  complete: boolean;
  tokensUsed: number;
  costCents: number;
}

export interface FinalizeAgentSessionInput {
  sessionId: string;
  artifacts: AgentArtifact[];
  status: string;
}

export interface LoadAgentContextInput {
  sessionId: string;
}

export interface SaveAgentCheckpointInput {
  sessionId: string;
  checkpoint: AgentCheckpoint;
  memorySnapshot?: Record<string, unknown>;
  contextWindow?: unknown[];
}

export interface AgentActivities {
  executeAgentStep(
    input: ExecuteAgentStepInput
  ): Promise<ExecuteAgentStepOutput>;
  finalizeAgentSession(input: FinalizeAgentSessionInput): Promise<void>;
  loadAgentContext(
    input: LoadAgentContextInput
  ): Promise<Record<string, unknown>>;
  saveAgentCheckpoint(input: SaveAgentCheckpointInput): Promise<void>;
}
