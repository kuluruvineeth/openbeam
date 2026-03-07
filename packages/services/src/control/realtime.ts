import type { ControlEvent } from "@openbeam/redis";
import { publishControlEvent } from "@openbeam/redis";

export interface ControlLiveEvent {
  teamId: string;
  type: string;
  payload: Record<string, unknown>;
  timestamp?: Date;
}

type LiveEventHandler = (event: ControlLiveEvent) => void | Promise<void>;

const handlers: LiveEventHandler[] = [];

export function onControlLiveEvent(handler: LiveEventHandler): () => void {
  handlers.push(handler);
  return () => {
    const index = handlers.indexOf(handler);
    if (index >= 0) {
      handlers.splice(index, 1);
    }
  };
}

export async function publishControlLiveEvent(
  event: Omit<ControlLiveEvent, "timestamp">
) {
  const fullEvent: ControlLiveEvent = {
    ...event,
    timestamp: new Date(),
  };

  for (const handler of handlers) {
    await handler(fullEvent);
  }

  try {
    await publishControlEvent(event.teamId, {
      teamId: event.teamId,
      type: event.type,
      payload: event.payload,
      timestamp: Date.now(),
    } as ControlEvent);
    // biome-ignore lint/suspicious/noEmptyBlockStatements: best-effort pub/sub
  } catch {}
}

export function publishAgentStatusChanged(
  teamId: string,
  agentId: string,
  status: string
) {
  return publishControlLiveEvent({
    teamId,
    type: "agent.status_changed",
    payload: { agentId, status },
  });
}

export function publishRunStarted(
  teamId: string,
  agentId: string,
  runId: string
) {
  return publishControlLiveEvent({
    teamId,
    type: "heartbeat.run_started",
    payload: { agentId, runId },
  });
}

export function publishRunCompleted(
  teamId: string,
  agentId: string,
  runId: string,
  status: string
) {
  return publishControlLiveEvent({
    teamId,
    type: "heartbeat.run_completed",
    payload: { agentId, runId, status },
  });
}

export function publishRunOutput(
  teamId: string,
  runId: string,
  stream: string,
  chunk: string
) {
  return publishControlLiveEvent({
    teamId,
    type: "heartbeat.run_output",
    payload: { runId, stream, chunk },
  });
}

export function publishActivityCreated(
  teamId: string,
  entityType: string,
  entityId: string,
  action: string
) {
  return publishControlLiveEvent({
    teamId,
    type: "activity.created",
    payload: { entityType, entityId, action },
  });
}
