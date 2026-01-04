import type { ExecutableAgent } from "../base";
import type { AgentConfig } from "../config";

export function createAgentFromConfig(config: AgentConfig): ExecutableAgent {
  switch (config.type) {
    case "llm": {
      const { createLlmAgent } = require("./llm-agent");
      return createLlmAgent(config);
    }
    case "sequential": {
      const { createSequentialAgent } = require("./sequential-agent");
      return createSequentialAgent(config);
    }
    case "parallel": {
      const { createParallelAgent } = require("./parallel-agent");
      return createParallelAgent(config);
    }
    case "coordinator": {
      const { createCoordinatorAgent } = require("./coordinator-agent");
      return createCoordinatorAgent(config);
    }
    case "loop": {
      const { createLoopAgent } = require("./loop-agent");
      return createLoopAgent(config);
    }
    default: {
      const exhaustiveCheck: never = config;
      throw new Error(
        `Unknown agent type: ${(exhaustiveCheck as AgentConfig).type}`
      );
    }
  }
}
