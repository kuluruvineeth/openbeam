import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DaemonClient } from "@server/client/daemon-client";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { useCallback, useEffect, useRef } from "react";
import { Platform } from "react-native";

const STORAGE_PREFIX = "@openbeam:expo-push-token:";

function getExpoProjectId(): string | null {
  // biome-ignore lint/suspicious/noExplicitAny: React Native type interop
  const fromEas = (Constants as any)?.easConfig?.projectId;
  if (typeof fromEas === "string" && fromEas.trim()) {
    return fromEas.trim();
  }

  // biome-ignore lint/suspicious/noExplicitAny: React Native type interop
  const fromExtra = (Constants as any)?.expoConfig?.extra?.eas?.projectId;
  if (typeof fromExtra === "string" && fromExtra.trim()) {
    return fromExtra.trim();
  }

  return null;
}

async function ensurePushPermission(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === "granted") {
    return true;
  }
  if (!existing.canAskAgain) {
    return false;
  }
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === "granted";
}

export function usePushTokenRegistration(params: {
  client: DaemonClient;
  serverId: string;
}): void {
  const { client, serverId } = params;
  const tokenRef = useRef<string | null>(null);
  const lastSentTokenRef = useRef<string | null>(null);

  // biome-ignore lint/suspicious/useAwait: async signature required by interface
  const registerIfPossible = useCallback(async () => {
    if (Platform.OS === "web") {
      return;
    }
    if (!client.isConnected) {
      return;
    }
    const token = tokenRef.current;
    if (!token) {
      return;
    }
    if (lastSentTokenRef.current === token) {
      return;
    }
    lastSentTokenRef.current = token;
    client.registerPushToken(token);
  }, [client]);

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }

    const storageKey = `${STORAGE_PREFIX}${serverId}`;
    let cancelled = false;

    const run = async () => {
      const cached = await AsyncStorage.getItem(storageKey);
      if (cancelled) {
        return;
      }
      if (cached && typeof cached === "string") {
        tokenRef.current = cached;
      }

      const granted = await ensurePushPermission();
      if (!granted || cancelled) {
        return;
      }

      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }

      const projectId = getExpoProjectId();
      if (!projectId) {
        console.warn(
          "[PushToken] Missing EAS projectId; cannot fetch Expo push token"
        );
        return;
      }

      const result = await Notifications.getExpoPushTokenAsync({ projectId });
      if (cancelled) {
        return;
      }

      const token = result.data;
      if (typeof token !== "string" || !token.trim()) {
        return;
      }

      tokenRef.current = token;
      await AsyncStorage.setItem(storageKey, token);
      await registerIfPossible();
    };

    // biome-ignore lint/complexity/noVoid: fire-and-forget async call
    void run().catch((error) => {
      console.warn("[PushToken] Failed to register push token", error);
    });

    return () => {
      cancelled = true;
    };
  }, [registerIfPossible, serverId]);

  useEffect(() => {
    const unsubscribe = client.subscribeConnectionStatus((state) => {
      if (state.status === "connected") {
        // biome-ignore lint/complexity/noVoid: fire-and-forget async call
        void registerIfPossible();
      } else {
        // Re-register on the next successful connect.
        lastSentTokenRef.current = null;
      }
    });
    if (client.isConnected) {
      // biome-ignore lint/complexity/noVoid: fire-and-forget async call
      void registerIfPossible();
    }
    return unsubscribe;
  }, [client, registerIfPossible]);
}
