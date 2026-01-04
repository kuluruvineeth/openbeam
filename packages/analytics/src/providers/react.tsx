"use client";

import type { PostHog } from "posthog-js";
import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { initBrowserClient, resetBrowserClient } from "../clients/browser";
import type { AnalyticsConfig } from "../config";

interface AnalyticsContextValue {
  client: PostHog;
  identify: (userId: string, properties?: Record<string, unknown>) => void;
  reset: () => void;
  capture: (event: string, properties?: Record<string, unknown>) => void;
  group: (
    groupType: string,
    groupKey: string,
    properties?: Record<string, unknown>
  ) => void;
  isReady: boolean;
}

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null);

interface AnalyticsProviderProps {
  children: React.ReactNode;
  config: Partial<AnalyticsConfig> & { apiKey: string };
}

export function AnalyticsProvider({
  children,
  config,
}: AnalyticsProviderProps) {
  const [isReady, setIsReady] = useState(false);

  const client = useMemo(() => {
    const c = initBrowserClient(config);
    setIsReady(true);
    return c;
  }, [config]);

  const identify = useCallback(
    (userId: string, properties?: Record<string, unknown>) => {
      client.identify(userId, properties);
    },
    [client]
  );

  const reset = useCallback(() => {
    resetBrowserClient();
  }, []);

  const capture = useCallback(
    (event: string, properties?: Record<string, unknown>) => {
      client.capture(event, properties);
    },
    [client]
  );

  const group = useCallback(
    (
      groupType: string,
      groupKey: string,
      properties?: Record<string, unknown>
    ) => {
      client.group(groupType, groupKey, properties);
    },
    [client]
  );

  const value = useMemo(
    () => ({ client, identify, reset, capture, group, isReady }),
    [client, identify, reset, capture, group, isReady]
  );

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalytics(): AnalyticsContextValue {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error("useAnalytics must be used within AnalyticsProvider");
  }
  return context;
}

export function usePostHog(): PostHog {
  const { client } = useAnalytics();
  return client;
}

export function useFeatureFlag(flag: string): boolean | undefined {
  const { client, isReady } = useAnalytics();
  const [value, setValue] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    const unsubscribe = client.onFeatureFlags(() => {
      setValue(client.isFeatureEnabled(flag) ?? undefined);
    });

    const currentValue = client.isFeatureEnabled(flag);
    if (currentValue !== undefined) {
      setValue(currentValue);
    }

    return unsubscribe;
  }, [client, flag, isReady]);

  return value;
}

export function useFeatureFlagVariant<T extends string>(
  flag: string
): T | undefined {
  const { client, isReady } = useAnalytics();
  const [value, setValue] = useState<T | undefined>(undefined);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    const unsubscribe = client.onFeatureFlags(() => {
      setValue(client.getFeatureFlag(flag) as T | undefined);
    });

    const currentValue = client.getFeatureFlag(flag);
    if (currentValue !== undefined) {
      setValue(currentValue as T);
    }

    return unsubscribe;
  }, [client, flag, isReady]);

  return value;
}

export function useFeatureFlagPayload<T>(flag: string): T | undefined {
  const { client, isReady } = useAnalytics();
  const [value, setValue] = useState<T | undefined>(undefined);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    const unsubscribe = client.onFeatureFlags(() => {
      setValue(client.getFeatureFlagPayload(flag) as T | undefined);
    });

    const currentValue = client.getFeatureFlagPayload(flag);
    if (currentValue !== undefined) {
      setValue(currentValue as T);
    }

    return unsubscribe;
  }, [client, flag, isReady]);

  return value;
}

export function useExperiment<T extends string>(
  experimentFlag: string,
  variants: readonly T[]
): { variant: T | undefined; isLoading: boolean } {
  const rawValue = useFeatureFlagVariant<T>(experimentFlag);
  const isLoading = rawValue === undefined;

  const variant = useMemo(() => {
    if (rawValue === undefined) {
      return;
    }
    return variants.includes(rawValue) ? rawValue : undefined;
  }, [rawValue, variants]);

  return { variant, isLoading };
}

export function useIdentify() {
  const { identify } = useAnalytics();
  return identify;
}

export function useCapture() {
  const { capture } = useAnalytics();
  return capture;
}

export function useGroup() {
  const { group } = useAnalytics();
  return group;
}
