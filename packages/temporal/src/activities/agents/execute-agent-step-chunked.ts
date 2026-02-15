import type { ChunkCheckpoint } from "@openplane/types/temporal/agent-heartbeat";
import { TIMEOUT_TIERS } from "@openplane/types/temporal/agent-timeouts";
import { Context } from "@temporalio/activity";
import type { AgentCheckpoint } from "../../workflows/types";
import type {
  ChunkedAgentExecutor,
  ExecuteAgentStepChunkedInput,
  ExecuteAgentStepChunkedOutput,
} from "./chunked-types";

export interface ExecuteAgentStepChunkedDependencies {
  executor: ChunkedAgentExecutor;
  persistCheckpoint: (
    sessionId: string,
    checkpoint: ChunkCheckpoint
  ) => Promise<void>;
}

function toChunkCheckpoint(value: unknown): ChunkCheckpoint | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const candidate = value as {
    chunkIndex?: unknown;
    partialArtifacts?: unknown;
    intermediateState?: unknown;
    tokensUsed?: unknown;
    costCents?: unknown;
    timestamp?: unknown;
  };

  if (
    typeof candidate.chunkIndex !== "number" ||
    !Array.isArray(candidate.partialArtifacts) ||
    !candidate.intermediateState ||
    typeof candidate.intermediateState !== "object" ||
    Array.isArray(candidate.intermediateState) ||
    typeof candidate.tokensUsed !== "number" ||
    typeof candidate.costCents !== "number" ||
    typeof candidate.timestamp !== "number"
  ) {
    return null;
  }

  return {
    chunkIndex: candidate.chunkIndex,
    partialArtifacts: candidate.partialArtifacts,
    intermediateState: candidate.intermediateState as Record<string, unknown>,
    tokensUsed: candidate.tokensUsed,
    costCents: candidate.costCents,
    timestamp: candidate.timestamp,
  };
}

export function createExecuteAgentStepChunkedActivity(
  deps: ExecuteAgentStepChunkedDependencies
) {
  return async function executeAgentStepChunked(
    input: ExecuteAgentStepChunkedInput
  ): Promise<ExecuteAgentStepChunkedOutput> {
    const tierConfig = TIMEOUT_TIERS[input.tier];
    const collectedArtifacts: ExecuteAgentStepChunkedOutput["artifacts"] = [];
    let totalTokens = 0;
    let totalCost = 0;
    let lastChunkCheckpoint = input.resumeFromChunk;
    let chunksExecuted = lastChunkCheckpoint?.chunkIndex ?? 0;
    let stepComplete = false;

    const heartbeatDetails = Context.current().info.heartbeatDetails;
    const resumeHeartbeat = Array.isArray(heartbeatDetails)
      ? toChunkCheckpoint(heartbeatDetails[0])
      : toChunkCheckpoint(heartbeatDetails);
    if (resumeHeartbeat) {
      lastChunkCheckpoint = resumeHeartbeat;
      chunksExecuted = resumeHeartbeat.chunkIndex;
      totalTokens = resumeHeartbeat.tokensUsed;
      totalCost = resumeHeartbeat.costCents;
    }

    while (chunksExecuted < input.maxChunks) {
      if (Context.current().cancellationSignal.aborted) {
        break;
      }

      const chunkResult = await deps.executor.executeChunk({
        sessionId: input.sessionId,
        agentType: input.agentType,
        step: input.step,
        chunkIndex: chunksExecuted,
        previousOutput: lastChunkCheckpoint,
        context: {
          ...input.context,
          previousArtifacts: input.previousArtifacts,
          accumulatedArtifacts: collectedArtifacts,
        },
      });

      collectedArtifacts.push(...chunkResult.artifacts);
      totalTokens += chunkResult.tokensUsed;
      totalCost += chunkResult.costCents;
      chunksExecuted += 1;

      lastChunkCheckpoint = {
        chunkIndex: chunksExecuted,
        partialArtifacts: collectedArtifacts,
        intermediateState: chunkResult.intermediateState,
        tokensUsed: totalTokens,
        costCents: totalCost,
        timestamp: Date.now(),
      };

      Context.current().heartbeat(lastChunkCheckpoint);

      if (
        chunksExecuted % input.checkpointEveryNChunks === 0 &&
        chunksExecuted > 0
      ) {
        await deps.persistCheckpoint(input.sessionId, lastChunkCheckpoint);
      }

      if (chunkResult.complete || !chunkResult.needsMoreChunks) {
        stepComplete = chunkResult.complete;
        break;
      }

      const remainingChunks = input.maxChunks - chunksExecuted;
      const remainingMs = tierConfig.chunkTimeoutMs * remainingChunks;
      if (remainingMs < tierConfig.chunkTimeoutMs * 0.5) {
        await deps.persistCheckpoint(input.sessionId, lastChunkCheckpoint);
        break;
      }
    }

    const checkpoint: AgentCheckpoint = {
      step: input.step,
      state: {
        ...input.context,
        chunksExecuted,
        tokensUsed: totalTokens,
        costCents: totalCost,
        lastChunkCheckpoint,
      },
      timestamp: Date.now(),
    };

    return {
      artifacts: collectedArtifacts,
      checkpoint,
      lastChunkCheckpoint,
      complete: stepComplete,
      chunksExecuted,
      tokensUsed: totalTokens,
      costCents: totalCost,
      timedOut: chunksExecuted >= input.maxChunks && !stepComplete,
    };
  };
}
