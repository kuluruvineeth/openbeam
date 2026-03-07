import type { Database } from "@openbeam/db";
import { appendSessionEvent } from "@openbeam/db";
import { publishSessionRuntimeEvent } from "@openbeam/redis";
import { redactToolPayload } from "@openbeam/services/policy/redaction-policy";
import type {
  RuntimeEvent,
  RuntimeEventPayload,
} from "@openbeam/types/canvas/runtime-events";
import {
  recordRuntimeEventEmission,
  recordRuntimeEventPersistFailure,
  recordRuntimeEventPublishFailure,
} from "../../observability/prometheus";

export type EmitContext = {
  db: Database;
  sessionId: string;
  canvasId: string;
  teamId: string;
  executionId: string;
  turnId?: string;
  stepId?: string;
};

function resolveSource(
  eventType: string
): "user" | "agent" | "system" | "tool" {
  if (eventType.startsWith("tool.")) {
    return "tool";
  }
  return "system";
}

export async function emitRuntimeEvent(
  ctx: EmitContext,
  rawPayload: RuntimeEventPayload
): Promise<void> {
  const totalStart = performance.now();
  const payload = redactToolPayload(rawPayload);
  const event: RuntimeEvent = {
    eventId: crypto.randomUUID(),
    sequence: 0,
    timestamp: Date.now(),
    canvasId: ctx.canvasId,
    sessionId: ctx.sessionId,
    turnId: ctx.turnId,
    executionId: ctx.executionId,
    stepId: ctx.stepId,
    source: resolveSource(payload.type),
    visibility: "visible",
    payload,
  };

  let persistMs = 0;
  let publishMs = 0;

  const persistStart = performance.now();
  try {
    const persisted = await appendSessionEvent(ctx.db, ctx.sessionId, {
      teamId: ctx.teamId,
      agentCanvasId: ctx.canvasId,
      executionId: ctx.executionId,
      turnId: ctx.turnId,
      eventType: payload.type,
      source: event.source,
      visibility: event.visibility,
      payload: payload as unknown as Record<string, unknown>,
      eventTimestamp: new Date(event.timestamp),
    });
    persistMs = performance.now() - persistStart;
    event.sequence = persisted.sequence;
  } catch (error) {
    persistMs = performance.now() - persistStart;
    recordRuntimeEventPersistFailure();
    recordRuntimeEventEmission({
      payloadType: payload.type,
      status: "failure",
      persistMs,
      publishMs: 0,
      totalMs: performance.now() - totalStart,
    });
    throw error;
  }

  const publishStart = performance.now();
  try {
    await publishSessionRuntimeEvent(ctx.sessionId, event);
  } catch {
    recordRuntimeEventPublishFailure();
  }
  publishMs = performance.now() - publishStart;

  recordRuntimeEventEmission({
    payloadType: payload.type,
    status: "success",
    persistMs,
    publishMs,
    totalMs: performance.now() - totalStart,
  });
}
