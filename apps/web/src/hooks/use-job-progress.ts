"use client";

import { useEffect, useRef } from "react";
import type { JobProgress } from "@/lib/job-status";
import { useJobStore } from "@/stores/job-store";
import { getVanillaTRPCClient } from "@/trpc/client";

const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_DELAY_MS = 30_000;

export function useJobProgressSubscription() {
  const reconnectAttempts = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  useEffect(() => {
    let isActive = true;
    let currentSubscription: { unsubscribe: () => void } | null = null;

    function subscribe() {
      if (!isActive) {
        return;
      }

      const client = getVanillaTRPCClient();

      currentSubscription = client.jobs.onProgress.subscribe(undefined, {
        onData: (progress: JobProgress) => {
          reconnectAttempts.current = 0;
          useJobStore.getState().upsertJob(progress);
        },
        onError: () => {
          scheduleReconnect();
        },
        onComplete: () => {
          scheduleReconnect();
        },
      });
    }

    function scheduleReconnect() {
      if (!isActive) {
        return;
      }

      currentSubscription?.unsubscribe();
      currentSubscription = null;

      const delay = Math.min(
        RECONNECT_DELAY_MS * 2 ** reconnectAttempts.current,
        MAX_RECONNECT_DELAY_MS
      );
      reconnectAttempts.current += 1;

      reconnectTimeoutRef.current = setTimeout(() => {
        subscribe();
      }, delay);
    }

    subscribe();

    return () => {
      isActive = false;
      currentSubscription?.unsubscribe();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);
}
