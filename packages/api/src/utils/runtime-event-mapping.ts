import type { CanvasStreamEvent } from "@openplane/ai";
import { appendSessionEvent } from "@openplane/db";
import { publishSessionRuntimeEvent } from "@openplane/redis";
import type {
  RuntimeEvent,
  RuntimeEventPayload,
} from "@openplane/types/canvas/runtime-events";

type Database = Parameters<typeof appendSessionEvent>[0];

type EventContext = {
  sessionId: string;
  canvasId: string;
  teamId: string;
  turnId: string;
};

type MappingContext = {
  toolNameByCallId?: Map<string, string>;
  activeCanvasToolCallId?: string;
};

const EPHEMERAL_EVENT_TYPES = new Set([
  "chat.assistant_delta",
  "chat.thinking",
  "execution.progress",
]);

const CANVAS_TOOL_PREFIX = "canvas_";

function resolveVisibility(
  payload: RuntimeEventPayload,
  explicit?: "visible" | "ephemeral" | "hidden"
): "visible" | "ephemeral" | "hidden" {
  if (explicit) {
    return explicit;
  }
  if (
    payload.type === "tool.call_result" &&
    payload.toolName.startsWith(CANVAS_TOOL_PREFIX)
  ) {
    return "hidden";
  }
  return "visible";
}

function createRuntimeEvent(
  ctx: EventContext,
  payload: RuntimeEventPayload,
  visibility?: "visible" | "ephemeral" | "hidden"
): RuntimeEvent {
  return {
    eventId: crypto.randomUUID(),
    sequence: 0,
    timestamp: Date.now(),
    canvasId: ctx.canvasId,
    sessionId: ctx.sessionId,
    turnId: ctx.turnId,
    source: resolveSource(payload.type),
    visibility: resolveVisibility(payload, visibility),
    payload,
  };
}

function resolveSource(
  eventType: string
): "user" | "agent" | "system" | "tool" {
  if (eventType.startsWith("chat.user")) {
    return "user";
  }
  if (eventType.startsWith("tool.")) {
    return "tool";
  }
  if (eventType.startsWith("execution.") || eventType.startsWith("session.")) {
    return "system";
  }
  return "agent";
}

export function mapBuilderEventToPayload(
  event: CanvasStreamEvent,
  context?: MappingContext
): RuntimeEventPayload | null {
  switch (event.type) {
    case "thinking":
      return { type: "chat.thinking", content: event.content };
    case "text":
      return { type: "chat.assistant_delta", chunk: event.chunk };
    case "tool_call": {
      context?.toolNameByCallId?.set(event.id, event.tool);
      if (context && event.tool.startsWith(CANVAS_TOOL_PREFIX)) {
        context.activeCanvasToolCallId = event.id;
      }
      return {
        type: "tool.call_start",
        toolCallId: event.id,
        toolName: event.tool,
        toolInput: event.input,
      };
    }
    case "tool_result": {
      const toolName = context?.toolNameByCallId?.get(event.id) ?? "";
      if (context && context.activeCanvasToolCallId === event.id) {
        context.activeCanvasToolCallId = undefined;
      }
      return {
        type: "tool.call_result",
        toolCallId: event.id,
        toolName,
        toolOutput: event.result,
        success: true,
      };
    }
    case "canvas_op": {
      const operation =
        event.operation.type === "add_node" && context?.activeCanvasToolCallId
          ? { ...event.operation, toolCallId: context.activeCanvasToolCallId }
          : event.operation;
      return {
        type: "canvas.op_applied",
        operation,
      };
    }
    case "error":
    case "complete":
      return null;
    default:
      return null;
  }
}

export async function appendAndPublishRuntimeEvent(
  db: Database,
  ctx: EventContext,
  payload: RuntimeEventPayload
): Promise<RuntimeEvent> {
  const event = createRuntimeEvent(ctx, payload);

  const persisted = await appendSessionEvent(db, ctx.sessionId, {
    teamId: ctx.teamId,
    agentCanvasId: ctx.canvasId,
    turnId: ctx.turnId,
    eventType: payload.type,
    source: event.source,
    visibility: event.visibility,
    payload: payload as unknown as Record<string, unknown>,
    eventTimestamp: new Date(event.timestamp),
  });

  event.sequence = persisted.sequence;

  await publishSessionRuntimeEvent(ctx.sessionId, event);
  return event;
}

export async function publishEphemeralRuntimeEvent(
  ctx: EventContext,
  payload: RuntimeEventPayload
): Promise<RuntimeEvent> {
  const event = createRuntimeEvent(ctx, payload, "ephemeral");
  await publishSessionRuntimeEvent(ctx.sessionId, event);
  return event;
}

export function isEphemeralEvent(eventType: string): boolean {
  return EPHEMERAL_EVENT_TYPES.has(eventType);
}

export function isCanvasToolName(toolName: string): boolean {
  return toolName.startsWith(CANVAS_TOOL_PREFIX);
}
