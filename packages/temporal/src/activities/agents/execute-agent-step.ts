import type {
  AgentExecutor,
  ExecuteAgentStepInput,
  ExecuteAgentStepOutput,
} from "./types";

export interface ExecuteAgentStepDependencies {
  executor: AgentExecutor;
}

export function createExecuteAgentStepActivity(
  deps: ExecuteAgentStepDependencies
) {
  return async function executeAgentStep(
    input: ExecuteAgentStepInput
  ): Promise<ExecuteAgentStepOutput> {
    const result = await deps.executor.executeStep(
      input.sessionId,
      input.agentType,
      input.step,
      input.previousArtifacts,
      input.context
    );

    return {
      artifacts: result.artifacts,
      checkpoint: {
        step: input.step,
        state: input.context,
        timestamp: Date.now(),
      },
      complete: result.complete,
      tokensUsed: result.tokensUsed ?? 0,
      costCents: result.costCents ?? 0,
    };
  };
}
