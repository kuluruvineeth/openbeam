"use client";

import type { RuntimeEvent } from "@openbeam/types/canvas/runtime-events";
import { useMemo } from "react";
import type { MessageData } from "../components/agent/agent-message-list";
import type { AgentEvent } from "./use-event-grouping";

type ChatStatus = "idle" | "streaming" | "complete" | "error";

const CHAT_PAYLOAD_TYPES = new Set([
  "chat.user_message",
  "chat.assistant_delta",
  "chat.assistant_final",
  "chat.thinking",
  "tool.call_start",
  "tool.call_result",
  "execution.started",
  "execution.progress",
  "execution.completed",
  "execution.failed",
]);

interface TurnAccumulator {
  turnId: string;
  userEvents: AgentEvent[];
  assistantEvents: AgentEvent[];
  firstTimestamp: number;
  hasAssistantFinal: boolean;
  hasFailed: boolean;
}

const SYNTHETIC_TURN_ID = "__no_turn__";

function isChatRelated(payloadType: string): boolean {
  return CHAT_PAYLOAD_TYPES.has(payloadType);
}

function mapRuntimeEventToAgentEvent(
  event: RuntimeEvent
): { role: "user" | "assistant"; agentEvent: AgentEvent } | null {
  const { payload, timestamp, visibility } = event;

  switch (payload.type) {
    case "chat.user_message":
      return {
        role: "user",
        agentEvent: {
          type: "text",
          timestamp,
          content: payload.content,
          isPartial: false,
        },
      };

    case "chat.assistant_delta":
      return {
        role: "assistant",
        agentEvent: {
          type: "text",
          timestamp,
          content: payload.chunk,
          isPartial: true,
        },
      };

    case "chat.assistant_final":
      return {
        role: "assistant",
        agentEvent: {
          type: "text",
          timestamp,
          content: payload.content,
          isPartial: false,
        },
      };

    case "chat.thinking":
      return {
        role: "assistant",
        agentEvent: {
          type: "thinking",
          timestamp,
          message: payload.content,
        },
      };

    case "tool.call_start":
      return {
        role: "assistant",
        agentEvent: {
          type: "tool_call",
          timestamp,
          toolCallId: payload.toolCallId,
          toolName: payload.toolName,
          displayName: payload.displayName ?? payload.toolName,
          toolInput: payload.toolInput,
          visibility: visibility ?? "visible",
        },
      };

    case "tool.call_result":
      return {
        role: "assistant",
        agentEvent: {
          type: "tool_result",
          timestamp,
          toolCallId: payload.toolCallId,
          toolName: payload.toolName,
          toolOutput: payload.toolOutput,
          durationMs: payload.durationMs,
          success: payload.success,
        },
      };

    case "execution.started":
      return {
        role: "assistant",
        agentEvent: {
          type: "status",
          timestamp,
          status: "started",
          message: `Execution ${payload.executionId} started`,
        },
      };

    case "execution.progress":
      return {
        role: "assistant",
        agentEvent: {
          type: "status",
          timestamp,
          status: "progress",
          message: payload.message ?? `Progress on ${payload.executionId}`,
        },
      };

    case "execution.completed":
      return {
        role: "assistant",
        agentEvent: {
          type: "done",
          timestamp,
          success: true,
        },
      };

    case "execution.failed":
      return {
        role: "assistant",
        agentEvent: {
          type: "error",
          timestamp,
          code: "EXECUTION_FAILED",
          message: payload.error,
          retryable: payload.retryable ?? false,
        },
      };

    default:
      return null;
  }
}

function getOrCreateTurn(
  turnMap: Map<string, TurnAccumulator>,
  turnOrder: string[],
  turnId: string,
  timestamp: number
): TurnAccumulator {
  let turn = turnMap.get(turnId);
  if (!turn) {
    turn = {
      turnId,
      userEvents: [],
      assistantEvents: [],
      firstTimestamp: timestamp,
      hasAssistantFinal: false,
      hasFailed: false,
    };
    turnMap.set(turnId, turn);
    turnOrder.push(turnId);
  }
  return turn;
}

function deriveChatStatus(turn: TurnAccumulator): ChatStatus {
  if (turn.hasFailed) {
    return "error";
  }
  if (turn.hasAssistantFinal) {
    return "complete";
  }
  if (turn.assistantEvents.length > 0) {
    return "streaming";
  }
  return "idle";
}

function turnToMessages(turn: TurnAccumulator): MessageData[] {
  const messages: MessageData[] = [];

  if (turn.userEvents.length > 0) {
    messages.push({
      id: `${turn.turnId}-user`,
      role: "user",
      events: turn.userEvents,
      status: "complete",
      createdAt: turn.firstTimestamp,
    });
  }

  if (turn.assistantEvents.length > 0) {
    messages.push({
      id: `${turn.turnId}-assistant`,
      role: "assistant",
      events: turn.assistantEvents,
      status: deriveChatStatus(turn),
      createdAt: turn.assistantEvents[0]?.timestamp ?? turn.firstTimestamp,
    });
  }

  return messages;
}

function projectRuntimeEventsToMessages(events: RuntimeEvent[]): MessageData[] {
  const turnMap = new Map<string, TurnAccumulator>();
  const turnOrder: string[] = [];

  for (const event of events) {
    if (!isChatRelated(event.payload.type)) {
      continue;
    }

    const mapped = mapRuntimeEventToAgentEvent(event);
    if (!mapped) {
      continue;
    }

    const turnId = event.turnId ?? SYNTHETIC_TURN_ID;
    const turn = getOrCreateTurn(turnMap, turnOrder, turnId, event.timestamp);

    if (mapped.role === "user") {
      turn.userEvents.push(mapped.agentEvent);
    } else {
      turn.assistantEvents.push(mapped.agentEvent);
    }

    if (event.payload.type === "chat.assistant_final") {
      turn.hasAssistantFinal = true;
    }
    if (event.payload.type === "execution.failed") {
      turn.hasFailed = true;
    }
  }

  const messages: MessageData[] = [];
  for (const turnId of turnOrder) {
    const turn = turnMap.get(turnId);
    if (turn) {
      messages.push(...turnToMessages(turn));
    }
  }

  return messages;
}

function useRuntimeAgentMessages(events: RuntimeEvent[]): MessageData[] {
  return useMemo(() => projectRuntimeEventsToMessages(events), [events]);
}

export { projectRuntimeEventsToMessages, useRuntimeAgentMessages };
export type { ChatStatus };
