import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { refreshSession } from "../lib/auth-client";
import { useAuthStore } from "../stores/auth-store";

const SESSION_REFRESH_INTERVAL_MS = 10 * 60 * 1000;
const BACKGROUND_STALE_THRESHOLD_MS = 5 * 60 * 1000;

export function useSessionMonitor() {
  const authState = useAuthStore((s) => s.authState);
  const setUser = useAuthStore((s) => s.setUser);
  const setAuthState = useAuthStore((s) => s.setAuthState);
  const lastBackgroundTime = useRef<number | null>(null);

  useEffect(() => {
    if (authState !== "authenticated") {
      return;
    }

    const interval = setInterval(async () => {
      const session = await refreshSession();
      if (session.user) {
        setUser(session.user);
      } else {
        setAuthState("unauthenticated");
        setUser(null);
      }
    }, SESSION_REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [authState, setUser, setAuthState]);

  useEffect(() => {
    if (authState !== "authenticated") {
      return;
    }

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "background" || nextState === "inactive") {
        lastBackgroundTime.current = Date.now();
        return;
      }

      if (nextState === "active" && lastBackgroundTime.current) {
        const elapsed = Date.now() - lastBackgroundTime.current;
        lastBackgroundTime.current = null;

        if (elapsed > BACKGROUND_STALE_THRESHOLD_MS) {
          // biome-ignore lint/complexity/noVoid: fire-and-forget async call
          void refreshSession().then((session) => {
            if (session.user) {
              setUser(session.user);
            } else {
              setAuthState("unauthenticated");
              setUser(null);
            }
          });
        }
      }
    });

    return () => subscription.remove();
  }, [authState, setUser, setAuthState]);
}
