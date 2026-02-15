import { Context } from "@temporalio/activity";
import type {
  ExecuteParallelAgentStepsInput,
  ExecuteParallelAgentStepsOutput,
} from "./chunked-types";
import type { AgentExecutor } from "./types";

export interface ExecuteParallelAgentStepsDependencies {
  executor: AgentExecutor;
}

export function createExecuteParallelAgentStepsActivity(
  deps: ExecuteParallelAgentStepsDependencies
) {
  return async function executeParallelAgentSteps(
    input: ExecuteParallelAgentStepsInput
  ): Promise<ExecuteParallelAgentStepsOutput> {
    const branches = await Promise.all(
      input.branches.map(async (branch) => {
        const result = await deps.executor.executeStep(
          input.sessionId,
          input.agentType,
          input.step,
          branch.previousArtifacts,
          branch.context
        );

        Context.current().heartbeat({
          phase: "synthesizing",
          branchId: branch.branchId,
          complete: result.complete,
        });

        return {
          branchId: branch.branchId,
          artifacts: result.artifacts,
          tokensUsed: result.tokensUsed ?? 0,
          costCents: result.costCents ?? 0,
          complete: result.complete,
        };
      })
    );

    let totalTokensUsed = 0;
    let totalCostCents = 0;
    for (const branch of branches) {
      totalTokensUsed += branch.tokensUsed;
      totalCostCents += branch.costCents;
    }

    return {
      branches,
      totalTokensUsed,
      totalCostCents,
    };
  };
}
