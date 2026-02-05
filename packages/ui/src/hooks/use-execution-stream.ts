"use client";

import type { ExecutionEvent } from "@openplane/types/canvas/execution-events";
import { ExecutionEventSchema } from "@openplane/types/canvas/execution-events";
import { useCallback, useEffect, useRef, useState } from "react";

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

interface UseExecutionStreamOptions {
  executionId: string;
  enabled?: boolean;
  baseUrl?: string;
  onEvent?: (event: ExecutionEvent) => void;
  onError?: (error: Error) => void;
  onConnectionChange?: (status: ConnectionStatus) => void;
  includeStepDetails?: boolean;
  includeOutput?: boolean;
  reconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelayMs?: number;
}

interface UseExecutionStreamReturn {
  events: ExecutionEvent[];
  lastEvent: ExecutionEvent | null;
  connectionStatus: ConnectionStatus;
  error: Error | null;
  reconnectAttempt: number;
  connect: () => void;
  disconnect: () => void;
  clearEvents: () => void;
}

export function useExecutionStream({
  executionId,
  enabled = true,
  baseUrl = "/api/executions",
  onEvent,
  onError,
  onConnectionChange,
  includeStepDetails = true,
  includeOutput = false,
  reconnect = true,
  maxReconnectAttempts = 5,
  reconnectDelayMs = 1000,
}: UseExecutionStreamOptions): UseExecutionStreamReturn {
  const [events, setEvents] = useState<ExecutionEvent[]>([]);
  const [lastEvent, setLastEvent] = useState<ExecutionEvent | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");
  const [error, setError] = useState<Error | null>(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const isIntentionalDisconnect = useRef(false);

  const updateConnectionStatus = useCallback(
    (status: ConnectionStatus) => {
      setConnectionStatus(status);
      onConnectionChange?.(status);
    },
    [onConnectionChange]
  );

  const handleError = useCallback(
    (err: Error) => {
      setError(err);
      onError?.(err);
    },
    [onError]
  );

  const processEvent = useCallback(
    (rawEvent: MessageEvent) => {
      try {
        const data = JSON.parse(rawEvent.data);
        const parsed = ExecutionEventSchema.safeParse(data);

        if (!parsed.success) {
          return;
        }

        const event = parsed.data;
        setEvents((prev) => [...prev, event]);
        setLastEvent(event);
        onEvent?.(event);

        if (
          event.type === "execution.completed" ||
          event.type === "execution.failed" ||
          event.type === "execution.cancelled"
        ) {
          isIntentionalDisconnect.current = true;
          eventSourceRef.current?.close();
          updateConnectionStatus("disconnected");
        }
      } catch {
        return;
      }
    },
    [onEvent, updateConnectionStatus]
  );

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    isIntentionalDisconnect.current = false;
    updateConnectionStatus("connecting");
    setError(null);

    const params = new URLSearchParams({
      includeStepDetails: String(includeStepDetails),
      includeOutput: String(includeOutput),
    });

    const url = `${baseUrl}/${executionId}/stream?${params}`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      updateConnectionStatus("connected");
      setReconnectAttempt(0);
    };

    eventSource.onmessage = processEvent;

    eventSource.onerror = () => {
      eventSource.close();

      if (isIntentionalDisconnect.current) {
        updateConnectionStatus("disconnected");
        return;
      }

      updateConnectionStatus("error");

      if (reconnect && reconnectAttempt < maxReconnectAttempts) {
        const delay = reconnectDelayMs * 2 ** reconnectAttempt;
        const nextAttempt = reconnectAttempt + 1;
        setReconnectAttempt(nextAttempt);

        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      } else {
        handleError(
          new Error(
            reconnectAttempt >= maxReconnectAttempts
              ? "Max reconnection attempts exceeded"
              : "Connection failed"
          )
        );
      }
    };
  }, [
    baseUrl,
    executionId,
    handleError,
    includeOutput,
    includeStepDetails,
    maxReconnectAttempts,
    processEvent,
    reconnect,
    reconnectAttempt,
    reconnectDelayMs,
    updateConnectionStatus,
  ]);

  const disconnect = useCallback(() => {
    isIntentionalDisconnect.current = true;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    updateConnectionStatus("disconnected");
    setReconnectAttempt(0);
  }, [updateConnectionStatus]);

  const clearEvents = useCallback(() => {
    setEvents([]);
    setLastEvent(null);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: connect/disconnect depend on reconnectAttempt state which would cause infinite reconnection loops
  useEffect(() => {
    if (enabled && executionId) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, executionId]);

  return {
    events,
    lastEvent,
    connectionStatus,
    error,
    reconnectAttempt,
    connect,
    disconnect,
    clearEvents,
  };
}

export type {
  UseExecutionStreamOptions,
  UseExecutionStreamReturn,
  ConnectionStatus,
};
