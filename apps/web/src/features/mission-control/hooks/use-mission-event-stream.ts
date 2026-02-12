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
  enabled = true,
}: UseMissionEventStreamOptions): UseMissionEventStreamReturn {
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const ingestEvent = useMissionRuntimeStore((s) => s.ingestEvent);

  const cleanup = useCallback(() => {
    subscriptionRef.current?.unsubscribe();
    subscriptionRef.current = null;
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    cleanup();

    if (!(enabled && missionId && runId)) {
      return;
    }

    const client = getVanillaTRPCClient() as ReturnType<
      typeof getVanillaTRPCClient
    > & {
      missionControl: {
        onMissionEvent: {
          subscribe: (
            input: { missionId: string; runId: string },
            opts: {
              onData: (event: MissionEventPayload) => void;
              onStarted: () => void;
              onError: (err: unknown) => void;
              onComplete: () => void;
            }
          ) => { unsubscribe: () => void };
        };
      };
    };

    const sub = client.missionControl.onMissionEvent.subscribe(
      { missionId, runId },
      {
        onData(event: MissionEventPayload) {
          if (event.eventType === "connected") {
            return;
          }
          ingestEvent(runId, toEventLedgerItem(event));
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
  }, [missionId, runId, enabled, ingestEvent, cleanup]);

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
