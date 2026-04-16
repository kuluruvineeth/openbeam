import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { ExecuteAgentResult, StepRecord } from "@openbeam/types/computer";
import { createStepLogger } from "./step-logger";

interface ReplayOptions {
  mcpClient: Client;
  runId: string;
  actions: Array<{
    tool: string;
    args: Record<string, unknown>;
    description?: string;
  }>;
}

export async function executeProposedActions(
  options: ReplayOptions
): Promise<ExecuteAgentResult> {
  const steps: StepRecord[] = [];
  const stepLogger = createStepLogger(steps);
  let toolCallCount = 0;

  try {
    for (const action of options.actions) {
      toolCallCount += 1;
      const step = stepLogger.log("TOOL_CALL", action.tool, action.args);
      try {
        const result = await options.mcpClient.callTool({
          name: action.tool,
          arguments: action.args,
        });
        step.done(result);
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Action failed";
        step.done({ error: msg });
        throw error;
      }
    }

    return {
      success: true,
      proposalSubmitted: false,
      steps,
      toolCallCount,
      llmCallCount: 0,
    };
  } catch (error) {
    return {
      success: false,
      proposalSubmitted: false,
      error: error instanceof Error ? error.message : String(error),
      steps,
      toolCallCount,
      llmCallCount: 0,
    };
  }
}
