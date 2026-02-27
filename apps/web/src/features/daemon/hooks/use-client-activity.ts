"use client";

import { useCallback, useEffect, useRef } from "react";

const HEARTBEAT_INTERVAL_MS = 15_000;
const ACTIVITY_HEARTBEAT_THROTTLE_MS = 5000;

interface HeartbeatPayload {
  deviceType: "web";
  focusedAgentId: string | null;
  lastActivityAt: string;
  appVisible: boolean;
  appVisibilityChangedAt: string;
}

interface DaemonClientLike {
  isConnected: boolean;
  sendHeartbeat: (payload: HeartbeatPayload) => void;
  subscribeConnectionStatus: (
    listener: (state: { status: string }) => void
  ) => () => void;
}

interface ClientActivityOptions {
  client?: DaemonClientLike | null;
  focusedAgentId?: string | null;
  onAppResumed?: (awayMs: number) => void;
}

export function useClientActivity(options?: ClientActivityOptions): void {
  const client = options?.client ?? null;
  const focusedAgentId = options?.focusedAgentId ?? null;
  const onAppResumed = options?.onAppResumed;
  const lastActivityAtRef = useRef<Date>(new Date());
  const appVisibleRef = useRef(
    typeof document !== "undefined"
      ? document.visibilityState === "visible"
      : true
  );
  const appVisibilityChangedAtRef = useRef<Date>(new Date());
  const backgroundedAtMsRef = useRef<number | null>(
    appVisibleRef.current ? null : Date.now()
  );
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  const prevFocusedAgentIdRef = useRef<string | null>(focusedAgentId);
  const lastImmediateHeartbeatAtRef = useRef<number>(0);

  const recordUserActivity = useCallback(() => {
    lastActivityAtRef.current = new Date();
  }, []);

  const sendHeartbeat = useCallback(() => {
    if (!client?.isConnected) {
      return;
    }
    client.sendHeartbeat({
      deviceType: "web",
      focusedAgentId,
      lastActivityAt: lastActivityAtRef.current.toISOString(),
      appVisible: appVisibleRef.current,
      appVisibilityChangedAt: appVisibilityChangedAtRef.current.toISOString(),
    });
  }, [client, focusedAgentId]);

  const setAppVisible = useCallback(
    (nextVisible: boolean) => {
      if (appVisibleRef.current === nextVisible) {
        return;
      }
      appVisibleRef.current = nextVisible;
      appVisibilityChangedAtRef.current = new Date();

      if (!nextVisible) {
        backgroundedAtMsRef.current = Date.now();
        return;
      }

      const backgroundedAt = backgroundedAtMsRef.current;
      backgroundedAtMsRef.current = null;
      if (backgroundedAt !== null) {
        onAppResumed?.(Math.max(0, Date.now() - backgroundedAt));
      }
      recordUserActivity();
    },
    [onAppResumed, recordUserActivity]
  );

  const maybeSendImmediateHeartbeat = useCallback(() => {
    if (!client?.isConnected) {
      return;
    }
    const now = Date.now();
    if (
      now - lastImmediateHeartbeatAtRef.current <
      ACTIVITY_HEARTBEAT_THROTTLE_MS
    ) {
      return;
    }
    lastImmediateHeartbeatAtRef.current = now;
    sendHeartbeat();
  }, [client, sendHeartbeat]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const handleUserActivity = () => {
      recordUserActivity();
      maybeSendImmediateHeartbeat();
    };

    const handleVisibilityChange = () => {
      const visible = document.visibilityState === "visible";
      setAppVisible(visible);
      if (visible) {
        maybeSendImmediateHeartbeat();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleUserActivity);
    window.addEventListener("pointerdown", handleUserActivity, {
      passive: true,
    });
    window.addEventListener("keydown", handleUserActivity);
    window.addEventListener("wheel", handleUserActivity, { passive: true });

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleUserActivity);
      window.removeEventListener("pointerdown", handleUserActivity);
      window.removeEventListener("keydown", handleUserActivity);
      window.removeEventListener("wheel", handleUserActivity);
    };
  }, [maybeSendImmediateHeartbeat, recordUserActivity, setAppVisible]);

  useEffect(() => {
    if (prevFocusedAgentIdRef.current !== focusedAgentId) {
      prevFocusedAgentIdRef.current = focusedAgentId;
      recordUserActivity();
      sendHeartbeat();
    }
  }, [focusedAgentId, recordUserActivity, sendHeartbeat]);

  useEffect(() => {
    const startHeartbeat = () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      sendHeartbeat();
      heartbeatIntervalRef.current = setInterval(
        sendHeartbeat,
        HEARTBEAT_INTERVAL_MS
      );
    };

    const stopHeartbeat = () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };

    if (!client) {
      return stopHeartbeat;
    }

    const unsubscribe = client.subscribeConnectionStatus((state) => {
      if (state.status === "connected") {
        startHeartbeat();
      } else {
        stopHeartbeat();
      }
    });

    if (client.isConnected) {
      startHeartbeat();
    }

    return () => {
      unsubscribe();
      stopHeartbeat();
    };
  }, [client, sendHeartbeat]);
}
