import type { AgentEvent, ToolVisibility } from "./events";
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

/**
 * Agent Event Transformer
 *
 * Transforms raw agent/LLM events into the unified AgentEvent format.
 *
 * DYNAMIC-FIRST PHILOSOPHY:
 * - Model-generated descriptions OVERRIDE static metadata
 * - Thinking messages come from the model's actual reasoning
 * - Static metadata (registrations.ts) is FALLBACK only
 * - Agents should pass `modelDescription` for truly dynamic UI
 *
 * Priority order for display text:
 * 1. raw.modelDescription (model-generated, dynamic)
 * 2. raw.content (for thinking events)
 * 3. Static metadata from getToolMetadata() (fallback)
 *
 * This enables agents to communicate what they're ACTUALLY doing,
 * not what we pre-wrote in a static mapping.
 */

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

export interface EventTransformer {
  onThinking(message: string): AgentEvent[];
  onToolCall(
    toolCallId: string,
    toolName: string,
    toolInput?: unknown,
    modelDescription?: string
  ): AgentEvent[];
  onToolResult(
    toolCallId: string,
    toolName: string,
    toolOutput?: unknown,
    sourceCount?: number
  ): AgentEvent[];
  onText(content: string, isPartial?: boolean): AgentEvent[];
  onError(code: string, message: string, retryable?: boolean): AgentEvent[];
  onDone(success: boolean, metadata?: Record<string, unknown>): AgentEvent[];
  filterByVisibility(events: AgentEvent[]): AgentEvent[];
}

export function createEventTransformer(
  options: TransformerOptions = {}
): EventTransformer {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const toolStartTimes = new Map<string, number>();

  function shouldInclude(visibility: ToolVisibility): boolean {
    return opts.visibilityFilter?.includes(visibility) ?? true;
  }

  return {
    onThinking(message: string): AgentEvent[] {
      if (!opts.emitThinkingEvents) {
        return [];
      }
      return [thinking(message, opts.agentName)];
    },

    onToolCall(
      toolCallId: string,
      toolName: string,
      toolInput?: unknown,
      modelDescription?: string
    ): AgentEvent[] {
      toolStartTimes.set(toolCallId, performance.now());

      const meta = getToolMetadata(toolName);
      const events: AgentEvent[] = [];

      // Model-generated description takes priority over static metadata
      const displayName = modelDescription ?? meta.displayName;

      if (opts.emitStatusEvents) {
        const toolStatus = getStatusForTool(toolName);
        if (toolStatus) {
          // Use model description for status message if available
          const statusMessage = modelDescription ?? toolStatus.message;
          events.push(status(toolStatus.status, statusMessage, opts.agentName));
        }
      }

      if (shouldInclude(meta.visibility)) {
        events.push(
          toolCall(toolCallId, toolName, displayName, {
            toolInput,
            visibility: meta.visibility,
            agentName: opts.agentName,
          })
        );
      }

      return events;
    },

    onToolResult(
      toolCallId: string,
      toolName: string,
      toolOutput?: unknown,
      sourceCount?: number
    ): AgentEvent[] {
      const meta = getToolMetadata(toolName);
      if (!shouldInclude(meta.visibility)) {
        return [];
      }

      const startTime = toolStartTimes.get(toolCallId);
      const durationMs = startTime ? performance.now() - startTime : undefined;
      toolStartTimes.delete(toolCallId);

      return [
        toolResult(toolCallId, toolName, {
          toolOutput,
          durationMs,
          success: true,
          sourceCount,
          agentName: opts.agentName,
        }),
      ];
    },

    onText(content: string, isPartial = true): AgentEvent[] {
      return [text(content, isPartial, opts.agentName)];
    },

    onError(code: string, message: string, retryable = false): AgentEvent[] {
      return [error(code, message, retryable, opts.agentName)];
    },

    onDone(success: boolean, metadata?: Record<string, unknown>): AgentEvent[] {
      return [done(success, metadata, opts.agentName)];
    },

    filterByVisibility(events: AgentEvent[]): AgentEvent[] {
      return events.filter((event) => {
        if (event.type !== "tool_call" && event.type !== "tool_result") {
          return true;
        }
        const meta = getToolMetadata(event.toolName);
        return shouldInclude(meta.visibility);
      });
    },
  };
}

export async function* transformStream(
  source: AsyncGenerator<RawAgentEvent>,
  options: TransformerOptions = {}
): AsyncGenerator<AgentEvent> {
  const transformer = createEventTransformer(options);

  for await (const raw of source) {
    const events = transformRawEvent(raw, transformer);
    for (const event of events) {
      yield event;
    }
  }
}

export interface RawAgentEvent {
  type: string;
  content?: string;
  toolCallId?: string;
  toolName?: string;
  toolInput?: unknown;
  toolOutput?: unknown;
  sourceCount?: number;
  error?: string;
  errorCode?: string;
  retryable?: boolean;
  success?: boolean;
  metadata?: Record<string, unknown>;
  /**
   * Model-generated description of what's happening.
   * When provided, this OVERRIDES static metadata.
   * Enables truly dynamic agent-to-UI communication.
   */
  modelDescription?: string;
}

function transformRawEvent(
  raw: RawAgentEvent,
  transformer: EventTransformer
): AgentEvent[] {
  switch (raw.type) {
    case "thinking":
      return transformer.onThinking(raw.content ?? "Thinking...");

    case "tool-call":
    case "tool_call":
      if (!(raw.toolCallId && raw.toolName)) {
        return [];
      }
      return transformer.onToolCall(
        raw.toolCallId,
        raw.toolName,
        raw.toolInput,
        raw.modelDescription
      );

    case "tool-result":
    case "tool_result":
      if (!(raw.toolCallId && raw.toolName)) {
        return [];
      }
      return transformer.onToolResult(
        raw.toolCallId,
        raw.toolName,
        raw.toolOutput,
        raw.sourceCount
      );

    case "text":
      return transformer.onText(raw.content ?? "", true);

    case "error":
      return transformer.onError(
        raw.errorCode ?? "UNKNOWN",
        raw.error ?? "An error occurred",
        raw.retryable ?? false
      );

    case "done":
    case "step":
    case "step-finish":
      return transformer.onDone(raw.success ?? true, raw.metadata);

    default:
      return [];
  }
}
