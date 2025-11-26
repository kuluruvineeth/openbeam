/**
 * AI SDK Agentic Workflows
 *
 * Modern agent implementation using AI SDK's agentic patterns.
 * Uses generateText with maxSteps for tool loops and structured outputs.
 *
 * Key features:
 * - maxSteps for automatic tool calling loops
 * - onStepFinish callbacks for observability
 * - Database-backed conversation persistence
 * - Redis-backed context caching
 * - Vespa-backed knowledge retrieval
 */

import {
  type CoreMessage,
  generateText,
  type StepResult,
  streamText,
  type ToolResultPart,
} from "ai";
import { getConfig } from "../config";
import { registry } from "../providers";
import type { ProviderId } from "../providers/types";
import { toolRegistry } from "../tools";
import type { AgentContext, AgentTaskType } from "./types";

/**
 * Agent configuration for agentic workflows
 */
export interface AgentV6Config {
  /** Provider to use (openai, anthropic, google) */
  provider?: ProviderId;
  /** Model ID to use */
  model?: string;
  /** System prompt for the agent */
  systemPrompt?: string;
  /** Temperature for responses (0-1) */
  temperature?: number;
  /** Maximum steps for tool calling loops */
  maxSteps?: number;
  /** Maximum tokens per response */
  maxTokens?: number;
  /** Callback when a step finishes */
  onStepFinish?: (event: StepFinishEvent) => void | Promise<void>;
  /** Abort signal for cancellation */
  abortSignal?: AbortSignal;
}

/**
 * Step finish event for observability
 */
export interface StepFinishEvent {
  stepType: "initial" | "tool-result" | "continue";
  text: string;
  toolCalls: Array<{
    toolCallId: string;
    toolName: string;
    args: unknown;
  }>;
  toolResults: ToolResultPart[];
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: string;
  isContinued: boolean;
}

/**
 * Agent execution result
 */
export interface AgentResult {
  /** Final text response */
  text: string;
  /** All tool calls made during execution */
  toolCalls: Array<{
    toolCallId: string;
    toolName: string;
    args: unknown;
  }>;
  /** All tool results */
  toolResults: ToolResultPart[];
  /** All steps taken */
  steps: StepResult<Record<string, unknown>>[];
  /** Token usage */
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** How the agent finished */
  finishReason: string;
}

/**
 * Create a configured language model for the agent
 */
function getAgentModel(config: AgentV6Config = {}) {
  const aiConfig = getConfig();
  return registry.getChatModel(
    config.provider || aiConfig.defaultProvider,
    config.model || aiConfig.defaultChatModel
  );
}

/**
 * Build messages from agent context including conversation history
 */
async function buildMessages(
  task: string,
  context: AgentContext,
  systemPrompt?: string
): Promise<CoreMessage[]> {
  const messages: CoreMessage[] = [];

  // Add conversation history if available
  if (context.conversationId) {
    try {
      const { getConversationMessages } = await import("@openplane/db");
      const prisma = (await import("@openplane/db")).default;
      const result = await getConversationMessages(
        prisma,
        context.conversationId,
        {
          limit: getConfig().agent.memoryWindowSize,
          order: "asc",
        }
      );

      for (const msg of result.messages) {
        messages.push({
          role: msg.role.toLowerCase() as "user" | "assistant" | "system",
          content: msg.content,
        });
      }
    } catch (error) {
      // Continue without history if DB unavailable
      console.warn("Could not load conversation history:", error);
    }
  }

  // Add current task
  messages.push({
    role: "user",
    content: task,
  });

  return messages;
}

/**
 * Execute an agent with a task (non-streaming)
 *
 * Uses AI SDK's generateText with maxSteps for automatic tool calling loops.
 * The agent will continue calling tools until:
 * - No more tool calls are needed
 * - maxSteps is reached
 * - The abort signal is triggered
 */
export async function executeAgent(
  task: string,
  context: AgentContext,
  config: AgentV6Config = {}
): Promise<AgentResult> {
  const aiConfig = getConfig();
  const model = getAgentModel(config);
  const messages = await buildMessages(task, context, config.systemPrompt);

  // Create contextual tools
  const tools = toolRegistry.createContextualTools({
    teamId: context.teamId,
    userId: context.userId,
    accessControl: context.accessControl,
    conversationId: context.conversationId,
    executionId: context.executionId,
    abortSignal: context.abortSignal || config.abortSignal,
  });

  const result = await generateText({
    model,
    system: config.systemPrompt || "You are a helpful AI assistant.",
    messages,
    tools: Object.keys(tools).length > 0 ? tools : undefined,
    maxSteps: config.maxSteps ?? aiConfig.agent.maxSteps,
    temperature: config.temperature,
    maxTokens: config.maxTokens ?? aiConfig.agent.maxTokensPerStep,
    abortSignal: context.abortSignal || config.abortSignal,
    onStepFinish: config.onStepFinish
      ? async (event) => {
          const stepEvent: StepFinishEvent = {
            stepType: event.stepType,
            text: event.text,
            toolCalls: event.toolCalls.map((tc) => ({
              toolCallId: tc.toolCallId,
              toolName: tc.toolName,
              args: tc.args,
            })),
            toolResults: event.toolResults,
            usage: event.usage,
            finishReason: event.finishReason,
            isContinued: event.isContinued,
          };
          await config.onStepFinish?.(stepEvent);
        }
      : undefined,
  });

  return {
    text: result.text,
    toolCalls: result.toolCalls.map((tc) => ({
      toolCallId: tc.toolCallId,
      toolName: tc.toolName,
      args: tc.args,
    })),
    toolResults: result.toolResults,
    steps: result.steps,
    usage: result.usage,
    finishReason: result.finishReason,
  };
}

/**
 * Stream agent execution
 *
 * Yields text chunks as they come in, with tool calling handled automatically.
 */
export async function* streamAgent(
  task: string,
  context: AgentContext,
  config: AgentV6Config = {}
): AsyncGenerator<
  | { type: "text"; content: string }
  | { type: "tool-call"; toolCallId: string; toolName: string; args: unknown }
  | { type: "tool-result"; toolCallId: string; result: unknown }
  | { type: "step-finish"; step: StepFinishEvent }
  | { type: "done"; result: AgentResult }
> {
  const aiConfig = getConfig();
  const model = getAgentModel(config);
  const messages = await buildMessages(task, context, config.systemPrompt);

  const tools = toolRegistry.createContextualTools({
    teamId: context.teamId,
    userId: context.userId,
    accessControl: context.accessControl,
    conversationId: context.conversationId,
    executionId: context.executionId,
    abortSignal: context.abortSignal || config.abortSignal,
  });

  const result = streamText({
    model,
    system: config.systemPrompt || "You are a helpful AI assistant.",
    messages,
    tools: Object.keys(tools).length > 0 ? tools : undefined,
    maxSteps: config.maxSteps ?? aiConfig.agent.maxSteps,
    temperature: config.temperature,
    maxTokens: config.maxTokens ?? aiConfig.agent.maxTokensPerStep,
    abortSignal: context.abortSignal || config.abortSignal,
    onStepFinish: config.onStepFinish
      ? async (event) => {
          const stepEvent: StepFinishEvent = {
            stepType: event.stepType,
            text: event.text,
            toolCalls: event.toolCalls.map((tc) => ({
              toolCallId: tc.toolCallId,
              toolName: tc.toolName,
              args: tc.args,
            })),
            toolResults: event.toolResults,
            usage: event.usage,
            finishReason: event.finishReason,
            isContinued: event.isContinued,
          };
          await config.onStepFinish?.(stepEvent);
        }
      : undefined,
  });

  // Stream text chunks
  for await (const chunk of result.textStream) {
    yield { type: "text", content: chunk };
  }

  // Get final result
  const finalResult = await result;

  yield {
    type: "done",
    result: {
      text: finalResult.text,
      toolCalls: finalResult.toolCalls.map((tc) => ({
        toolCallId: tc.toolCallId,
        toolName: tc.toolName,
        args: tc.args,
      })),
      toolResults: finalResult.toolResults,
      steps: finalResult.steps,
      usage: finalResult.usage,
      finishReason: finalResult.finishReason,
    },
  };
}

/**
 * Create an agent with a specific configuration
 *
 * Returns a function that can execute tasks with the pre-configured settings.
 */
export function createAgent(config: AgentV6Config = {}) {
  return {
    /**
     * Execute a task with the agent
     */
    async run(task: string, context: AgentContext): Promise<AgentResult> {
      return executeAgent(task, context, config);
    },

    /**
     * Stream task execution
     */
    stream(task: string, context: AgentContext) {
      return streamAgent(task, context, config);
    },

    /**
     * Get the current configuration
     */
    getConfig() {
      return { ...config };
    },

    /**
     * Create a new agent with updated config
     */
    withConfig(updates: Partial<AgentV6Config>) {
      return createAgent({ ...config, ...updates });
    },
  };
}

/**
 * Create agent for specific task type
 */
export function createTaskAgent(
  taskType: AgentTaskType,
  context: AgentContext
) {
  const systemPrompts: Record<AgentTaskType, string> = {
    research: `You are an expert researcher. Your goal is to gather comprehensive information to answer questions thoroughly.

Instructions:
- Break down complex questions into searchable queries
- Use the search tool to find relevant information
- Analyze and synthesize information from multiple sources
- Cite your sources when making claims
- If information is incomplete, acknowledge limitations`,

    analysis: `You are a data analyst. Your goal is to analyze information systematically and provide insights.

Instructions:
- Examine data methodically
- Identify patterns, trends, and anomalies
- Support findings with evidence
- Present analysis clearly with structure
- Highlight key insights and recommendations`,

    action: `You are an action executor. Your goal is to complete tasks safely and effectively.

Instructions:
- Understand the task requirements fully before acting
- Verify prerequisites are met
- Execute actions carefully and confirm results
- Report outcomes accurately
- Handle errors gracefully`,

    synthesis: `You are a synthesis expert. Your goal is to combine information from multiple sources into unified perspectives.

Instructions:
- Gather information from diverse sources
- Identify common themes and contradictions
- Reconcile different viewpoints
- Create coherent, unified summaries
- Acknowledge when consensus cannot be reached`,
  };

  return createAgent({
    systemPrompt: systemPrompts[taskType],
    maxSteps: 15,
    temperature: taskType === "analysis" ? 0.3 : 0.5,
  });
}

export default {
  createAgent,
  executeAgent,
  streamAgent,
  createTaskAgent,
};
