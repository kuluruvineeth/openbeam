import type { Database } from "@openplane/db";
import type { ChunkExecutionResult, ExecuteChunkInput } from "./chunked-types";
import { createExecuteAgentStepActivity } from "./execute-agent-step";
import { createExecuteAgentStepChunkedActivity } from "./execute-agent-step-chunked";
import { createExecuteParallelAgentStepsActivity } from "./execute-parallel-agent-steps";
import { createFinalizeAgentSessionActivity } from "./finalize-agent-session";
import { createLoadAgentContextActivity } from "./load-agent-context";
import { createSaveAgentCheckpointActivity } from "./save-agent-checkpoint";
import type { AgentActivities, AgentExecutor } from "./types";

export interface AgentActivityDependencies {
  db: Database;
  executor: AgentExecutor;
}

function createChunkedExecutor(executor: AgentExecutor): {
  executeChunk: (input: ExecuteChunkInput) => Promise<ChunkExecutionResult>;
} {
  if (executor.executeChunk) {
    return {
      executeChunk: executor.executeChunk.bind(executor),
    };
  }

  return {
    executeChunk: async (input) => {
      const {
        sessionId,
        agentType,
        step,
        chunkIndex,
        previousOutput,
        context,
      } = input;
      const result = await executor.executeStep(
        sessionId,
        agentType,
        step,
        [],
        {
          ...context,
          chunkIndex,
          previousChunkState: previousOutput?.intermediateState ?? null,
        }
      );

      return {
        artifacts: result.artifacts,
        intermediateState: {
          chunkIndex,
          complete: result.complete,
        },
        tokensUsed: result.tokensUsed ?? 0,
        costCents: result.costCents ?? 0,
        complete: result.complete,
        needsMoreChunks: !result.complete,
      };
    },
  };
}

export function createAgentActivities(
  deps: AgentActivityDependencies
): AgentActivities {
  const saveAgentCheckpoint = createSaveAgentCheckpointActivity({
    db: deps.db,
  });
  const chunkedExecutor = createChunkedExecutor(deps.executor);

  return {
    executeAgentStep: createExecuteAgentStepActivity({
      executor: deps.executor,
    }),
    executeAgentStepChunked: createExecuteAgentStepChunkedActivity({
      executor: chunkedExecutor,
      persistCheckpoint: async (sessionId, checkpoint) => {
        await saveAgentCheckpoint({
          sessionId,
          checkpoint: {
            step: checkpoint.chunkIndex,
            state: {
              chunkCheckpoint: checkpoint,
            },
            timestamp: checkpoint.timestamp,
          },
        });
      },
    }),
    executeParallelAgentSteps: createExecuteParallelAgentStepsActivity({
      executor: deps.executor,
    }),
    finalizeAgentSession: createFinalizeAgentSessionActivity({ db: deps.db }),
    loadAgentContext: createLoadAgentContextActivity({ db: deps.db }),
    saveAgentCheckpoint,
  };
}

export { LlmAgentExecutor } from "./llm-agent-executor";
export type { AgentActivities, AgentExecutor };
export type {
  ChunkExecutionResult,
  ChunkedAgentActivities,
  ChunkedAgentExecutor,
  ExecuteAgentStepChunkedInput,
  ExecuteAgentStepChunkedOutput,
  ExecuteParallelAgentStepsInput,
  ExecuteParallelAgentStepsOutput,
} from "./chunked-types";
export type {
  ExecuteAgentStepInput,
  ExecuteAgentStepOutput,
  FinalizeAgentSessionInput,
  LoadAgentContextInput,
  SaveAgentCheckpointInput,
} from "./types";
