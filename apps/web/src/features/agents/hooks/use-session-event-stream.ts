"use client";

import type { RuntimeEvent } from "@openbeam/types/canvas/runtime-events";
import { useCallback, useEffect, useRef, useState } from "react";
import { getVanillaTRPCClient } from "@/trpc/client";

export type UseSessionEventStreamOptions = {
  sessionId: string;
  enabled?: boolean;
  lastSequence?: number;
  onEvent?: (event: RuntimeEvent) => void;
  onError?: (error: Error) => void;
};

export type UseSessionEventStreamReturn = {
  events: RuntimeEvent[];
  lastEvent: RuntimeEvent | null;
  isConnected: boolean;
  error: Error | null;
  disconnect: () => void;
  clearEvents: () => void;
};

type Subscription = { unsubscribe: () => void };

const MAX_EVENTS = 10_000;

export function useSessionEventStream({
  sessionId,
  enabled = true,
  lastSequence,
  onEvent,
  onError,
}: UseSessionEventStreamOptions): UseSessionEventStreamReturn {
  const [events, setEvents] = useState<RuntimeEvent[]>([]);
  const [lastEvent, setLastEvent] = useState<RuntimeEvent | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const subscriptionRef = useRef<Subscription | null>(null);
  const onEventRef = useRef(onEvent);
  const onErrorRef = useRef(onError);
  const lastSequenceRef = useRef(lastSequence);
  onEventRef.current = onEvent;
  onErrorRef.current = onError;
  lastSequenceRef.current = lastSequence;

  const disconnect = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
    setLastEvent(null);
  }, []);

  useEffect(() => {
    if (!(enabled && sessionId)) {
      return;
    }

    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }

    setError(null);

    const client = getVanillaTRPCClient();
    const subscription = client.agentCanvas.onSessionEvent.subscribe(
      { sessionId, lastSequence: lastSequenceRef.current },
      {
        onData: (event: RuntimeEvent) => {
          setEvents((prev) => {
            const next = [...prev, event];
            return next.length > MAX_EVENTS ? next.slice(-MAX_EVENTS) : next;
          });
          setLastEvent(event);
          onEventRef.current?.(event);
        },
        onStarted: () => {
          setIsConnected(true);
        },
        onError: (err: unknown) => {
          const normalized =
            err instanceof Error ? err : new Error(String(err));
          setError(normalized);
          setIsConnected(false);
          onErrorRef.current?.(normalized);
        },
        onComplete: () => {
          setIsConnected(false);
          subscriptionRef.current = null;
        },
      }
    );

    subscriptionRef.current = subscription;

    return () => {
      subscription.unsubscribe();
      subscriptionRef.current = null;
    };
  }, [sessionId, enabled]);

  return { events, lastEvent, isConnected, error, disconnect, clearEvents };
}
