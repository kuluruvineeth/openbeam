"use client";

import type { RuntimeEvent } from "@openbeam/types/canvas/runtime-events";
import { useCallback, useEffect } from "react";
import { useAgenticRuntimeStore } from "../stores/agentic-runtime-store";
import { useSessionEventStream } from "./use-session-event-stream";

export type UseAgenticRuntimeStreamOptions = {
  sessionId: string;
  enabled?: boolean;
};

export type UseAgenticRuntimeStreamReturn = {
  isConnected: boolean;
  error: Error | null;
  disconnect: () => void;
};

export function useAgenticRuntimeStream({
  sessionId,
  enabled,
}: UseAgenticRuntimeStreamOptions): UseAgenticRuntimeStreamReturn {
  const lastSequence = useAgenticRuntimeStore((s) => s.lastSequence);
  const applyEvent = useAgenticRuntimeStore((s) => s.applyEvent);
  const setConnectionStatus = useAgenticRuntimeStore(
    (s) => s.setConnectionStatus
  );

  const onEvent = useCallback(
    (event: RuntimeEvent) => {
      applyEvent(event);
    },
    [applyEvent]
  );

  const onError = useCallback(
    (_error: Error) => {
      setConnectionStatus("error");
    },
    [setConnectionStatus]
  );

  const { isConnected, error, disconnect } = useSessionEventStream({
    sessionId,
    enabled,
    lastSequence,
    onEvent,
    onError,
  });

  useEffect(() => {
    if (isConnected) {
      setConnectionStatus("connected");
      return;
    }

    if (!error) {
      setConnectionStatus("idle");
    }
  }, [isConnected, error, setConnectionStatus]);

  return { isConnected, error, disconnect };
}
