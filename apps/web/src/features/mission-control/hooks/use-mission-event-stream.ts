"use client";

import type {
  MissionEventLedgerItem,
  MissionEventPayload,
} from "@openplane/types/mission-control";
import { useCallback, useEffect, useRef, useState } from "react";
import { getVanillaTRPCClient } from "@/trpc/client";
import { normalizeMissionEventType } from "../lib/event-type-normalization";
import { useMissionRuntimeStore } from "../stores/mission-runtime-store";

type UseMissionEventStreamOptions = {
  missionId: string;
  runId: string;
  agentName?: string;
  enabled?: boolean;
};

export type UseMissionEventStreamReturn = {
  isConnected: boolean;
  error: Error | null;
  retryCount: number;
  disconnect: () => void;
};

const MAX_BACKOFF_MS = 30_000;

export function getBackoffDelay(retries: number): number {
  return Math.min(1000 * 2 ** retries, MAX_BACKOFF_MS);
}

function toEventLedgerItem(event: MissionEventPayload): MissionEventLedgerItem {
  return {
    eventId: crypto.randomUUID(),
    missionId: event.missionId,
    runId: event.runId,
    lane: event.lane,
    sequence: event.sequence,
    eventType: normalizeMissionEventType(event.eventType),
    summary: normalizeMissionEventType(event.eventType),
    agentName: (event.payload?.agentName as string) ?? undefined,
    timestamp: event.timestamp,
    payload: event.payload,
  };
}

export function useMissionEventStream({
  missionId,
  runId,
  agentName,
  enabled = true,
}: UseMissionEventStreamOptions): UseMissionEventStreamReturn {
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const pendingEventsRef = useRef<MissionEventLedgerItem[]>([]);
  const retryCountRef = useRef(0);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const ingestBatch = useMissionRuntimeStore((s) => s.ingestBatch);

  const flushPendingEvents = useCallback(() => {
    const batch = pendingEventsRef.current.splice(0);
    if (batch.length > 0) {
      ingestBatch(runId, batch);
    }
    rafIdRef.current = null;
  }, [ingestBatch, runId]);

  const enqueueEvent = useCallback(
    (payload: MissionEventPayload) => {
      pendingEventsRef.current.push(toEventLedgerItem(payload));
      if (rafIdRef.current === null) {
        rafIdRef.current = window.requestAnimationFrame(flushPendingEvents);
      }
    },
    [flushPendingEvents]
  );

  const cleanup = useCallback(() => {
    subscriptionRef.current?.unsubscribe();
    subscriptionRef.current = null;
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (rafIdRef.current !== null) {
      window.cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    pendingEventsRef.current = [];
  }, []);

  const connect = useCallback(() => {
    cleanup();

    if (!(enabled && missionId && runId)) {
      return;
    }

    const client = getVanillaTRPCClient();

    const sub = client.missionControl.onMissionEvent.subscribe(
      { missionId, runId, agentName },
      {
        onData(event: MissionEventPayload) {
          if (event.eventType === "connected") {
            return;
          }
          enqueueEvent(event);
          setError(null);
        },
        onStarted() {
          setIsConnected(true);
          setError(null);
          retryCountRef.current = 0;
        },
        onError(err: unknown) {
          setIsConnected(false);
          const e = err instanceof Error ? err : new Error(String(err));
          setError(e);

          const delay = getBackoffDelay(retryCountRef.current);
          retryCountRef.current += 1;
          reconnectTimerRef.current = setTimeout(connect, delay);
        },
        onComplete() {
          setIsConnected(false);
        },
      }
    );

    subscriptionRef.current = sub;
  }, [missionId, runId, agentName, enabled, enqueueEvent, cleanup]);

  useEffect(() => {
    connect();
    return cleanup;
  }, [connect, cleanup]);

  const disconnect = useCallback(() => {
    cleanup();
    setIsConnected(false);
  }, [cleanup]);

  return {
    isConnected,
    error,
    retryCount: retryCountRef.current,
    disconnect,
  };
}
