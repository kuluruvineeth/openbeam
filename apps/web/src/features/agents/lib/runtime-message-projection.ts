import type { RuntimeEvent } from "@openbeam/types/canvas/runtime-events";

const CANVAS_TOOL_PREFIX = "canvas_";

function isCanvasTool(toolName: string): boolean {
  return toolName.startsWith(CANVAS_TOOL_PREFIX);
}

const GERUND_OVERRIDES: Record<string, string> = {
  auto: "Auto",
  get: "Reading",
  set: "Setting",
};

function toGerund(verb: string): string {
  const override = GERUND_OVERRIDES[verb];
  if (override) {
    return override;
  }
  if (verb.endsWith("e")) {
    return `${verb.charAt(0).toUpperCase()}${verb.slice(1, -1)}ing`;
  }
  return `${verb.charAt(0).toUpperCase()}${verb.slice(1)}ing`;
}

function deriveCanvasToolLabel(toolName: string): string {
  const stripped = toolName.slice(CANVAS_TOOL_PREFIX.length);
  const parts = stripped.split("_");
  const gerund = toGerund(parts[0]);
  const object = parts.slice(1).join(" ");
  return object ? `${gerund} ${object}` : gerund;
}

function getCanvasToolStatusLabel(toolName: string): string {
  if (!isCanvasTool(toolName)) {
    return "Modifying canvas";
  }
  return deriveCanvasToolLabel(toolName);
}

type ChatStatus = "idle" | "streaming" | "complete" | "error";

interface AgentEventBase {
  timestamp: number;
}

interface ThinkingAgentEvent extends AgentEventBase {
  type: "thinking";
  message: string;
}

interface StatusAgentEvent extends AgentEventBase {
  type: "status";
  status: string;
  message: string;
}

interface ToolCallAgentEvent extends AgentEventBase {
  type: "tool_call";
  toolCallId: string;
  toolName: string;
  displayName: string;
  toolInput?: unknown;
  visibility: "visible" | "ephemeral" | "hidden";
}

interface ToolResultAgentEvent extends AgentEventBase {
  type: "tool_result";
  toolCallId: string;
  toolName: string;
  toolOutput?: unknown;
  durationMs?: number;
  success: boolean;
}

interface TextAgentEvent extends AgentEventBase {
  type: "text";
  content: string;
  isPartial: boolean;
}

interface ErrorAgentEvent extends AgentEventBase {
  type: "error";
  code: string;
  message: string;
  retryable: boolean;
}

interface DoneAgentEvent extends AgentEventBase {
  type: "done";
  success: boolean;
}

type ProjectedAgentEvent =
  | ThinkingAgentEvent
  | StatusAgentEvent
  | ToolCallAgentEvent
  | ToolResultAgentEvent
  | TextAgentEvent
  | ErrorAgentEvent
  | DoneAgentEvent;

interface ProjectedMessage {
  id: string;
  role: "user" | "assistant";
  events: ProjectedAgentEvent[];
  status?: ChatStatus;
  createdAt: number;
}

interface TurnAccumulator {
  turnId: string;
  userEvents: ProjectedAgentEvent[];
  assistantEvents: ProjectedAgentEvent[];
  firstTimestamp: number;
  hasAssistantFinal: boolean;
  hasFailed: boolean;
}

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

function isChatRelated(payloadType: string): boolean {
  return CHAT_PAYLOAD_TYPES.has(payloadType);
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

function turnToMessages(turn: TurnAccumulator): ProjectedMessage[] {
  const messages: ProjectedMessage[] = [];

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
    const events = turn.hasAssistantFinal
      ? turn.assistantEvents.filter((e) => !(e.type === "text" && e.isPartial))
      : turn.assistantEvents;

    messages.push({
      id: `${turn.turnId}-assistant`,
      role: "assistant",
      events,
      status: deriveChatStatus(turn),
      createdAt: turn.assistantEvents[0]?.timestamp ?? turn.firstTimestamp,
    });
  } else if (
    !(turn.hasAssistantFinal || turn.hasFailed) &&
    turn.userEvents.length
  ) {
    messages.push({
      id: `${turn.turnId}-assistant`,
      role: "assistant",
      events: [
        {
          type: "text",
          timestamp: turn.firstTimestamp,
          content: "",
          isPartial: true,
        },
      ],
      status: "streaming",
      createdAt: turn.firstTimestamp,
    });
  }

  return messages;
}

const SYNTHETIC_TURN_ID = "__no_turn__";

function appendPartialText(
  turn: TurnAccumulator,
  chunk: string,
  timestamp: number
): void {
  if (!chunk) {
    return;
  }

  const lastEvent = turn.assistantEvents.at(-1);
  if (lastEvent?.type === "text" && lastEvent.isPartial) {
    lastEvent.content += chunk;
    return;
  }

  turn.assistantEvents.push({
    type: "text",
    timestamp,
    content: chunk,
    isPartial: true,
  });
}

export function projectRuntimeEventsToMessages(
  events: RuntimeEvent[]
): ProjectedMessage[] {
  const turnMap = new Map<string, TurnAccumulator>();
  const turnOrder: string[] = [];

  for (const event of events) {
    if (!isChatRelated(event.payload.type)) {
      continue;
    }

    if (event.visibility === "hidden") {
      continue;
    }

    const turnId = event.turnId ?? SYNTHETIC_TURN_ID;
    const turn = getOrCreateTurn(turnMap, turnOrder, turnId, event.timestamp);
    const { payload, timestamp, visibility } = event;

    switch (payload.type) {
      case "chat.user_message":
        turn.userEvents.push({
          type: "text",
          timestamp,
          content: payload.content,
          isPartial: false,
        });
        break;

      case "chat.assistant_delta":
        appendPartialText(turn, payload.chunk, timestamp);
        break;

      case "chat.assistant_final":
        turn.assistantEvents.push({
          type: "text",
          timestamp,
          content: payload.content,
          isPartial: false,
        });
        turn.hasAssistantFinal = true;
        break;

      case "chat.thinking":
        turn.assistantEvents.push({
          type: "thinking",
          timestamp,
          message: payload.content,
        });
        break;

      case "tool.call_start":
        if (isCanvasTool(payload.toolName)) {
          turn.assistantEvents.push({
            type: "status",
            timestamp,
            status: "canvas_tool",
            message: getCanvasToolStatusLabel(payload.toolName),
          });
        } else {
          turn.assistantEvents.push({
            type: "tool_call",
            timestamp,
            toolCallId: payload.toolCallId,
            toolName: payload.toolName,
            displayName: payload.displayName ?? payload.toolName,
            toolInput: payload.toolInput,
            visibility: visibility ?? "visible",
          });
        }
        break;

      case "tool.call_result":
        if (!isCanvasTool(payload.toolName)) {
          turn.assistantEvents.push({
            type: "tool_result",
            timestamp,
            toolCallId: payload.toolCallId,
            toolName: payload.toolName,
            toolOutput: payload.toolOutput,
            durationMs: payload.durationMs,
            success: payload.success,
          });
        }
        break;

      case "execution.started":
        turn.assistantEvents.push({
          type: "status",
          timestamp,
          status: "started",
          message: `Execution ${payload.executionId} started`,
        });
        break;

      case "execution.progress":
        turn.assistantEvents.push({
          type: "status",
          timestamp,
          status: "progress",
          message: payload.message ?? `Progress on ${payload.executionId}`,
        });
        break;

      case "execution.completed":
        turn.assistantEvents.push({
          type: "done",
          timestamp,
          success: true,
        });
        break;

      case "execution.failed":
        turn.assistantEvents.push({
          type: "error",
          timestamp,
          code: "EXECUTION_FAILED",
          message: payload.error,
          retryable: payload.retryable ?? false,
        });
        turn.hasFailed = true;
        break;

      default:
        break;
    }
  }

  const messages: ProjectedMessage[] = [];
  for (const turnId of turnOrder) {
    const turn = turnMap.get(turnId);
    if (turn) {
      messages.push(...turnToMessages(turn));
    }
  }

  return messages;
}

export type { ProjectedMessage, ProjectedAgentEvent, ChatStatus };
