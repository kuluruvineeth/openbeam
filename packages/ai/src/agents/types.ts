import type {
  AgentResult,
  AgentStreamEvent,
  AgentConfig as BaseAgentConfig,
  AgentContext as BaseAgentContext,
  StepFinishEvent,
} from "@openplane/types/ai";
import type { FinishReason as AISDKFinishReason } from "ai";

export type { AISDKFinishReason };

export interface AgentConfig extends BaseAgentConfig {
  onStepFinish?: (event: StepFinishEvent) => void | Promise<void>;
  abortSignal?: AbortSignal;
}

export interface AgentContext extends BaseAgentContext {
  abortSignal?: AbortSignal;
}

export interface Agent {
  run(task: string, context: AgentContext): Promise<AgentResult>;
  stream(task: string, context: AgentContext): AsyncGenerator<AgentStreamEvent>;
  getConfig(): AgentConfig;
  withConfig(updates: Partial<AgentConfig>): Agent;
}
