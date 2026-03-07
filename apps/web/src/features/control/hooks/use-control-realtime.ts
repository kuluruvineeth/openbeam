"use client";

import type { ControlEvent } from "@openbeam/redis";
import { useRef } from "react";
import { useTRPC } from "@/trpc/client";

export function useControlRealtimeEvents(
  onEvent: (event: ControlEvent) => void
) {
  const trpc = useTRPC();
  const callbackRef = useRef(onEvent);
  callbackRef.current = onEvent;

  trpc.control.realtime.onEvent.useSubscription(undefined, {
    onData(event) {
      callbackRef.current(event);
    },
  });
}

export function useAgentStatusUpdates(
  agentId: string | undefined,
  onStatusChange: (status: string) => void
) {
  const callbackRef = useRef(onStatusChange);
  callbackRef.current = onStatusChange;

  useControlRealtimeEvents((event) => {
    if (
      event.type === "agent.status_changed" &&
      (!agentId || event.payload.agentId === agentId)
    ) {
      callbackRef.current(event.payload.status);
    }
  });
}

export function useRunUpdates(
  runId: string | undefined,
  handlers: {
    onStarted?: (agentId: string) => void;
    onCompleted?: (status: string) => void;
    onOutput?: (stream: string, chunk: string) => void;
  }
) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useControlRealtimeEvents((event) => {
    if (!runId) {
      return;
    }

    switch (event.type) {
      case "heartbeat.run_started": {
        if (event.payload.runId === runId) {
          handlersRef.current.onStarted?.(event.payload.agentId);
        }
        break;
      }
      case "heartbeat.run_completed": {
        if (event.payload.runId === runId) {
          handlersRef.current.onCompleted?.(event.payload.status);
        }
        break;
      }
      case "heartbeat.run_output": {
        if (event.payload.runId === runId) {
          handlersRef.current.onOutput?.(
            event.payload.stream,
            event.payload.chunk
          );
        }
        break;
      }
      default:
        break;
    }
  });
}
