import type { AgentEvent, ToolVisibility } from "@openplane/types/ai";
import {
  done,
  error,
  status,
  text,
  thinking,
  toolCall,
  toolResult,
} from "./events";
import { getStatusForTool, getToolMetadata } from "./tool-metadata";

export interface TransformerOptions {
  agentName?: string;
  visibilityFilter?: ToolVisibility[];
  emitStatusEvents?: boolean;
  emitThinkingEvents?: boolean;
}

const DEFAULT_OPTIONS: TransformerOptions = {
  visibilityFilter: ["visible", "ephemeral"],
  emitStatusEvents: true,
  emitThinkingEvents: true,
};

export interface ToolResultParams {
  toolCallId: string;
  toolName: string;
  result: unknown;
  durationMs?: number;
  success?: boolean;
  sourceCount?: number;
}

export interface EventTransformer {
  onThinking(message: string): AgentEvent[];
  onToolCall(
    toolCallId: string,
    toolName: string,
    args: unknown,
    modelDescription?: string
  ): AgentEvent[];
  onToolResult(params: ToolResultParams): AgentEvent[];
  onText(content: string, isPartial?: boolean): AgentEvent[];
  onError(code: string, message: string, retryable?: boolean): AgentEvent[];
  onDone(success: boolean, metadata?: Record<string, unknown>): AgentEvent[];
}

export function createEventTransformer(
  options: TransformerOptions = {}
): EventTransformer {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { agentName, visibilityFilter, emitStatusEvents, emitThinkingEvents } =
    opts;

  function shouldEmit(visibility: ToolVisibility): boolean {
    return visibilityFilter?.includes(visibility) ?? true;
  }

  return {
    onThinking(message: string): AgentEvent[] {
      if (!emitThinkingEvents) {
        return [];
      }
      return [thinking(message, agentName)];
    },

    onToolCall(
      toolCallId: string,
      toolName: string,
      args: unknown,
      modelDescription?: string
    ): AgentEvent[] {
      const meta = getToolMetadata(toolName);
      if (!shouldEmit(meta.visibility)) {
        return [];
      }

      const events: AgentEvent[] = [];

      if (emitStatusEvents) {
        const statusInfo = getStatusForTool(toolName);
        if (statusInfo) {
          events.push(status(statusInfo.status, statusInfo.message, agentName));
        }
      }

      const displayName = modelDescription ?? meta.displayName;

      events.push(
        toolCall(toolCallId, toolName, displayName, {
          toolInput: args,
          visibility: meta.visibility,
          agentName,
        })
      );

      return events;
    },

    onToolResult(params: ToolResultParams): AgentEvent[] {
      const { toolCallId, toolName, result, durationMs, success, sourceCount } =
        params;
      const meta = getToolMetadata(toolName);
      if (!shouldEmit(meta.visibility)) {
        return [];
      }

      return [
        toolResult(toolCallId, toolName, {
          toolOutput: result,
          durationMs,
          success,
          sourceCount,
          agentName,
        }),
      ];
    },

    onText(content: string, isPartial = true): AgentEvent[] {
      return [text(content, isPartial, agentName)];
    },

    onError(code: string, message: string, retryable = false): AgentEvent[] {
      return [error(code, message, retryable, agentName)];
    },

    onDone(success: boolean, metadata?: Record<string, unknown>): AgentEvent[] {
      return [done(success, metadata, agentName)];
    },
  };
}

export type RawAgentEvent = {
  type: string;
  [key: string]: unknown;
};

export async function* transformStream(
  source: AsyncIterable<RawAgentEvent>,
  options?: TransformerOptions
): AsyncGenerator<AgentEvent> {
  const transformer = createEventTransformer(options);

  for await (const raw of source) {
    let events: AgentEvent[] = [];

    switch (raw.type) {
      case "thinking":
        events = transformer.onThinking(raw.message as string);
        break;
      case "tool_call":
        events = transformer.onToolCall(
          raw.toolCallId as string,
          raw.toolName as string,
          raw.args,
          raw.modelDescription as string | undefined
        );
        break;
      case "tool_result":
        events = transformer.onToolResult({
          toolCallId: raw.toolCallId as string,
          toolName: raw.toolName as string,
          result: raw.result,
          durationMs: raw.durationMs as number | undefined,
          success: raw.success as boolean | undefined,
          sourceCount: raw.sourceCount as number | undefined,
        });
        break;
      case "text":
        events = transformer.onText(
          raw.content as string,
          raw.isPartial as boolean | undefined
        );
        break;
      case "error":
        events = transformer.onError(
          raw.code as string,
          raw.message as string,
          raw.retryable as boolean | undefined
        );
        break;
      case "done":
        events = transformer.onDone(
          raw.success as boolean,
          raw.metadata as Record<string, unknown> | undefined
        );
        break;
      default:
        break;
    }

    for (const event of events) {
      yield event;
    }
  }
}
