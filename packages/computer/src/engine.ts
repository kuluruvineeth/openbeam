import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type {
  ExecuteAgentOptions,
  ExecuteAgentResult,
} from "@openbeam/types/computer";
import type { BindingTree } from "secure-exec";
import { createNodeDriver, NodeExecutionDriver } from "secure-exec";
import { createBindings } from "./bindings";
import { AGENT_LIMITS } from "./constants";
import { ProposalSubmittedError } from "./errors";

export async function executeAgent(
  options: ExecuteAgentOptions & { mcpClient: Client }
): Promise<ExecuteAgentResult> {
  const { bindings, steps, getCounters } = createBindings({
    db: options.db as Parameters<typeof createBindings>[0]["db"],
    teamId: options.teamId,
    userId: options.userId,
    agentId: options.agentId,
    agentName: options.agentName,
    agentSlug: options.agentSlug,
    runId: options.runId,
    mcpClient: options.mcpClient,
    triggerContext: options.triggerContext,
  });

  const systemDriver = createNodeDriver({
    permissions: {
      fs: () => ({ allow: false }),
      network: () => ({ allow: false }),
    },
  });

  const driver = new NodeExecutionDriver({
    system: systemDriver,
    runtime: systemDriver.runtime,
    memoryLimit: AGENT_LIMITS.memoryLimitMb,
    cpuTimeLimitMs: AGENT_LIMITS.cpuTimeLimitMs,
    bindings: bindings as unknown as BindingTree,
  });

  try {
    const result = await driver.run(options.code);
    const counters = getCounters();

    return {
      success: true,
      proposalSubmitted: false,
      result: (result as { exports?: unknown })?.exports ?? result,
      steps,
      toolCallCount: counters.toolCallCount,
      llmCallCount: counters.llmCallCount,
    };
  } catch (error) {
    if (error instanceof ProposalSubmittedError) {
      return {
        success: true,
        proposalSubmitted: true,
        steps,
        toolCallCount: getCounters().toolCallCount,
        llmCallCount: getCounters().llmCallCount,
      };
    }

    return {
      success: false,
      proposalSubmitted: false,
      error: error instanceof Error ? error.message : String(error),
      steps,
      toolCallCount: getCounters().toolCallCount,
      llmCallCount: getCounters().llmCallCount,
    };
  } finally {
    driver.dispose();
  }
}
