import type { AgentEvent } from "@openplane/types/ai";
import type { AgentStreamChunk } from "../../agents/base";
import { done, text, thinking, toolCall, toolResult } from "../events";
import { getStatusForTool, getToolMetadata } from "../tool-metadata";
import type { TransformerOptions } from "../transformer";

export interface AgentStreamAdapterOptions extends TransformerOptions {
  includeSteps?: boolean;
}

const DEFAULT_OPTIONS: AgentStreamAdapterOptions = {
  visibilityFilter: ["visible", "ephemeral"],
  emitStatusEvents: true,
  emitThinkingEvents: true,
  includeSteps: false,
};

export async function* adaptAgentStream(
  source: AsyncGenerator<AgentStreamChunk>,
  options: AgentStreamAdapterOptions = {}
): AsyncGenerator<AgentEvent> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const toolStartTimes = new Map<string, number>();

  const adaptDebug = {
    chunksReceived: 0,
    eventsYielded: 0,
    toolCallsReceived: 0,
    toolResultsReceived: 0,
  };

  for await (const chunk of source) {
    adaptDebug.chunksReceived += 1;

    if (chunk.type === "tool-call") {
      adaptDebug.toolCallsReceived += 1;
    }
    if (chunk.type === "tool-result") {
      adaptDebug.toolResultsReceived += 1;
    }

    const events = adaptChunk(chunk, opts, toolStartTimes);

    for (const event of events) {
      adaptDebug.eventsYielded += 1;
      yield event;
    }
  }
}

function adaptChunk(
  chunk: AgentStreamChunk,
  opts: AgentStreamAdapterOptions,
  toolStartTimes: Map<string, number>
): AgentEvent[] {
  switch (chunk.type) {
    case "thinking":
      return adaptThinking(chunk, opts);

    case "text":
      return adaptText(chunk, opts);

    case "tool-call":
      return adaptToolCall(chunk, opts, toolStartTimes);

    case "tool-result":
      return adaptToolResult(chunk, opts, toolStartTimes);

    case "step":
      if (opts.includeSteps && chunk.step) {
        return [
          done(chunk.step.status === "completed", {
            trace: chunk.step,
          }),
        ];
      }
      return [];

    case "done":
      return adaptDone(chunk, opts);

    default:
      return [];
  }
}

function adaptThinking(
  chunk: AgentStreamChunk,
  opts: AgentStreamAdapterOptions
): AgentEvent[] {
  if (!opts.emitThinkingEvents) {
    return [];
  }

  const message = chunk.modelDescription ?? chunk.content ?? "";
  if (!message) {
    return [];
  }

  return [thinking(message, chunk.agentName)];
}

function adaptText(
  chunk: AgentStreamChunk,
  _opts: AgentStreamAdapterOptions
): AgentEvent[] {
  const content = chunk.content ?? "";
  if (!content) {
    return [];
  }

  return [text(content, true, chunk.agentName)];
}

function adaptToolCall(
  chunk: AgentStreamChunk,
  opts: AgentStreamAdapterOptions,
  toolStartTimes: Map<string, number>
): AgentEvent[] {
  if (!(chunk.toolCallId && chunk.toolName)) {
    return [];
  }

  toolStartTimes.set(chunk.toolCallId, performance.now());

  const meta = getToolMetadata(chunk.toolName);

  if (!shouldIncludeVisibility(meta.visibility, opts)) {
    return [];
  }

  const events: AgentEvent[] = [];

  if (opts.emitStatusEvents) {
    const toolStatus = getStatusForTool(chunk.toolName);
    if (toolStatus) {
      const statusMessage = chunk.modelDescription ?? toolStatus.message;
      events.push({
        type: "status",
        timestamp: Date.now(),
        status: toolStatus.status,
        message: statusMessage,
        agentName: chunk.agentName,
      });
    }
  }

  const displayName = chunk.modelDescription ?? meta.displayName;

  events.push(
    toolCall(chunk.toolCallId, chunk.toolName, displayName, {
      toolInput: chunk.toolInput,
      visibility: meta.visibility,
      agentName: chunk.agentName,
    })
  );

  return events;
}

function adaptToolResult(
  chunk: AgentStreamChunk,
  opts: AgentStreamAdapterOptions,
  toolStartTimes: Map<string, number>
): AgentEvent[] {
  if (!(chunk.toolCallId && chunk.toolName)) {
    return [];
  }

  const meta = getToolMetadata(chunk.toolName);

  if (!shouldIncludeVisibility(meta.visibility, opts)) {
    return [];
  }

  const startTime = toolStartTimes.get(chunk.toolCallId);
  const durationMs = startTime ? performance.now() - startTime : undefined;
  toolStartTimes.delete(chunk.toolCallId);

  const sourceCount = extractSourceCount(chunk.toolOutput);

  return [
    toolResult(chunk.toolCallId, chunk.toolName, {
      toolOutput: chunk.toolOutput,
      durationMs,
      success: true,
      sourceCount,
      agentName: chunk.agentName,
    }),
  ];
}

function adaptDone(
  chunk: AgentStreamChunk,
  _opts: AgentStreamAdapterOptions
): AgentEvent[] {
  const success = chunk.result?.finishReason !== "error";

  const metadata: Record<string, unknown> = {};

  if (chunk.result) {
    if (chunk.result.totalTokens) {
      metadata.tokens = chunk.result.totalTokens;
    }
    if (chunk.result.durationMs) {
      metadata.durationMs = chunk.result.durationMs;
    }
  }

  return [done(success, metadata, chunk.agentName)];
}

function shouldIncludeVisibility(
  visibility: string,
  opts: AgentStreamAdapterOptions
): boolean {
  if (!opts.visibilityFilter) {
    return true;
  }
  return opts.visibilityFilter.includes(
    visibility as "visible" | "ephemeral" | "hidden"
  );
}

function extractSourceCount(output: unknown): number | undefined {
  if (!output || typeof output !== "object") {
    return;
  }

  const obj = output as Record<string, unknown>;

  if (typeof obj.sourceCount === "number") {
    return obj.sourceCount;
  }

  if (Array.isArray(obj.results)) {
    return obj.results.length;
  }

  if (Array.isArray(obj.items)) {
    return obj.items.length;
  }

  if (Array.isArray(obj.documents)) {
    return obj.documents.length;
  }
}

export function adaptSingleChunk(
  chunk: AgentStreamChunk,
  options: AgentStreamAdapterOptions = {}
): AgentEvent[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const toolStartTimes = new Map<string, number>();
  return adaptChunk(chunk, opts, toolStartTimes);
}
