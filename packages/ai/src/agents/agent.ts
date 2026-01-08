import {
  generateText,
  type ModelMessage,
  stepCountIs,
  streamText,
  type ToolSet,
} from "ai";
import { getConfig } from "../config";
import { registry } from "../providers/registry";
import type {
  Agent,
  AgentConfig,
  AgentContext,
  AgentResult,
  AgentStreamEvent,
  AgentTaskType,
  StepFinishEvent,
  TokenUsage,
  ToolCallInfo,
  ToolResult,
} from "./types";

function getAgentModel(config: AgentConfig) {
  const aiConfig = getConfig();
  return registry.chatModel(
    config.providerId || aiConfig.defaultProvider,
    config.modelId || aiConfig.defaultChatModel
  );
}

function buildMessages(task: string, systemPrompt?: string): ModelMessage[] {
  const messages: ModelMessage[] = [];

  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }

  messages.push({ role: "user", content: task });

  return messages;
}

function normalizeUsage(usage: {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}): TokenUsage {
  const inputTokens = usage.inputTokens ?? 0;
  const outputTokens = usage.outputTokens ?? 0;
  return {
    inputTokens,
    outputTokens,
    totalTokens: usage.totalTokens ?? inputTokens + outputTokens,
  };
}

export async function executeAgent(
  task: string,
  context: AgentContext,
  config: AgentConfig = {},
  tools?: ToolSet
): Promise<AgentResult> {
  const startTime = Date.now();
  const aiConfig = getConfig();
  const model = getAgentModel(config);
  const messages = buildMessages(task, config.systemPrompt);
  const maxSteps = config.maxSteps ?? aiConfig.agent.maxSteps;

  const result = await generateText({
    model,
    messages,
    tools,
    stopWhen: stepCountIs(maxSteps),
    temperature: config.temperature,
    maxOutputTokens: config.maxTokens ?? aiConfig.agent.maxTokensPerStep,
    abortSignal: context.abortSignal || config.abortSignal,
    onStepFinish: config.onStepFinish
      ? async (event) => {
          const toolCalls: ToolCallInfo[] = event.toolCalls.map((tc) => ({
            toolCallId: tc.toolCallId,
            toolName: tc.toolName,
            input: tc.input,
          }));

          const toolResults: ToolResult[] = event.toolResults.map((tr) => ({
            type: "tool-result" as const,
            toolCallId: tr.toolCallId,
            toolName: tr.toolName,
            output: tr.output,
          }));

          const stepEvent: StepFinishEvent = {
            stepType: "tool-result",
            text: event.text,
            toolCalls,
            toolResults,
            usage: normalizeUsage(event.usage),
            finishReason: event.finishReason,
            isContinued: false,
          };
          await config.onStepFinish?.(stepEvent);
        }
      : undefined,
  });

  const toolCalls: ToolCallInfo[] = result.toolCalls.map((tc) => ({
    toolCallId: tc.toolCallId,
    toolName: tc.toolName,
    input: tc.input,
  }));

  const toolResults: ToolResult[] = result.toolResults.map((tr) => ({
    type: "tool-result" as const,
    toolCallId: tr.toolCallId,
    toolName: tr.toolName,
    output: tr.output,
  }));

  return {
    text: result.text,
    toolCalls,
    toolResults,
    stepCount: result.steps.length,
    usage: normalizeUsage(result.usage),
    finishReason: result.finishReason,
    durationMs: Date.now() - startTime,
  };
}

export async function* streamAgent(
  task: string,
  context: AgentContext,
  config: AgentConfig = {},
  tools?: ToolSet
): AsyncGenerator<AgentStreamEvent> {
  const startTime = Date.now();
  const aiConfig = getConfig();
  const model = getAgentModel(config);
  const messages = buildMessages(task, config.systemPrompt);
  const maxSteps = config.maxSteps ?? aiConfig.agent.maxSteps;

  const result = streamText({
    model,
    messages,
    tools,
    stopWhen: stepCountIs(maxSteps),
    temperature: config.temperature,
    maxOutputTokens: config.maxTokens ?? aiConfig.agent.maxTokensPerStep,
    abortSignal: context.abortSignal || config.abortSignal,
    onStepFinish: config.onStepFinish
      ? async (event) => {
          const toolCalls: ToolCallInfo[] = event.toolCalls.map((tc) => ({
            toolCallId: tc.toolCallId,
            toolName: tc.toolName,
            input: tc.input,
          }));

          const toolResults: ToolResult[] = event.toolResults.map((tr) => ({
            type: "tool-result" as const,
            toolCallId: tr.toolCallId,
            toolName: tr.toolName,
            output: tr.output,
          }));

          const stepEvent: StepFinishEvent = {
            stepType: "tool-result",
            text: event.text,
            toolCalls,
            toolResults,
            usage: normalizeUsage(event.usage),
            finishReason: event.finishReason,
            isContinued: false,
          };
          await config.onStepFinish?.(stepEvent);
        }
      : undefined,
  });

  for await (const chunk of result.textStream) {
    yield { type: "text", content: chunk };
  }

  const [
    finalText,
    finalToolCalls,
    finalToolResults,
    finalSteps,
    finalUsage,
    finalFinishReason,
  ] = await Promise.all([
    result.text,
    result.toolCalls,
    result.toolResults,
    result.steps,
    result.usage,
    result.finishReason,
  ]);

  const toolCalls: ToolCallInfo[] = finalToolCalls.map((tc) => ({
    toolCallId: tc.toolCallId,
    toolName: tc.toolName,
    input: tc.input,
  }));

  const toolResults: ToolResult[] = finalToolResults.map((tr) => ({
    type: "tool-result" as const,
    toolCallId: tr.toolCallId,
    toolName: tr.toolName,
    output: tr.output,
  }));

  yield {
    type: "done",
    result: {
      text: finalText,
      toolCalls,
      toolResults,
      stepCount: finalSteps.length,
      usage: normalizeUsage(finalUsage),
      finishReason: finalFinishReason,
      durationMs: Date.now() - startTime,
    },
  };
}

export function createAgent(config: AgentConfig = {}, tools?: ToolSet): Agent {
  return {
    run(task: string, context: AgentContext): Promise<AgentResult> {
      return executeAgent(task, context, config, tools);
    },

    stream(
      task: string,
      context: AgentContext
    ): AsyncGenerator<AgentStreamEvent> {
      return streamAgent(task, context, config, tools);
    },

    getConfig(): AgentConfig {
      return { ...config };
    },

    withConfig(updates: Partial<AgentConfig>): Agent {
      return createAgent({ ...config, ...updates }, tools);
    },
  };
}

export function createTaskAgent(taskType: AgentTaskType): Agent {
  const systemPrompts: Record<AgentTaskType, string> = {
    research: `You are an expert researcher. Your goal is to gather comprehensive information.

Instructions:
- Break down complex questions into searchable queries
- Use available tools to find relevant information
- Analyze and synthesize information from multiple sources
- Cite your sources when making claims
- If information is incomplete, acknowledge limitations`,

    analysis: `You are a data analyst. Your goal is to analyze information systematically.

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

    synthesis: `You are a synthesis expert. Your goal is to combine information from multiple sources.

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
