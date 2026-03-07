"use client";

import type { AgentProvider } from "@openbeam/types/services/daemon";
import { useCallback, useSyncExternalStore } from "react";
import { z } from "zod";

const STORAGE_KEY = "openbeam-daemon-create-agent-preferences";

const providerPreferencesSchema = z.object({
  model: z.string().optional(),
  mode: z.string().optional(),
  thinkingOptionId: z.string().optional(),
});

const formPreferencesSchema = z.object({
  workingDir: z.string().optional(),
  provider: z.string().optional(),
  serverId: z.string().optional(),
  providerPreferences: z
    .record(z.string(), providerPreferencesSchema)
    .optional(),
});

export type ProviderPreferences = z.infer<typeof providerPreferencesSchema>;
export type FormPreferences = z.infer<typeof formPreferencesSchema>;

const DEFAULT_PREFERENCES: FormPreferences = {};

function readFromStorage(): FormPreferences {
  if (typeof window === "undefined") {
    return DEFAULT_PREFERENCES;
  }
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return DEFAULT_PREFERENCES;
  }
  const result = formPreferencesSchema.safeParse(JSON.parse(stored));
  return result.success ? result.data : DEFAULT_PREFERENCES;
}

let cachedPreferences = DEFAULT_PREFERENCES;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): FormPreferences {
  return cachedPreferences;
}

function getServerSnapshot(): FormPreferences {
  return DEFAULT_PREFERENCES;
}

function persist(next: FormPreferences): void {
  cachedPreferences = next;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  for (const listener of listeners) {
    listener();
  }
}

if (typeof window !== "undefined") {
  cachedPreferences = readFromStorage();
}

export interface UseFormPreferencesReturn {
  preferences: FormPreferences;
  getProviderPreferences: (
    provider: AgentProvider
  ) => ProviderPreferences | undefined;
  updatePreferences: (updates: Partial<FormPreferences>) => void;
  updateProviderPreferences: (
    provider: AgentProvider,
    updates: Partial<ProviderPreferences>
  ) => void;
}

export function useFormPreferences(): UseFormPreferencesReturn {
  const preferences = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const getProviderPreferences = useCallback(
    (provider: AgentProvider): ProviderPreferences | undefined => {
      const prefs = preferences.providerPreferences;
      return prefs ? prefs[provider] : undefined;
    },
    [preferences.providerPreferences]
  );

  const updatePreferences = useCallback((updates: Partial<FormPreferences>) => {
    persist({ ...cachedPreferences, ...updates });
  }, []);

  const updateProviderPreferences = useCallback(
    (provider: AgentProvider, updates: Partial<ProviderPreferences>) => {
      const prev = cachedPreferences;
      const existingPrefs = prev.providerPreferences ?? {};
      const existingProvider = existingPrefs[provider] ?? {};
      persist({
        ...prev,
        providerPreferences: {
          ...existingPrefs,
          [provider]: {
            ...existingProvider,
            ...updates,
          },
        },
      });
    },
    []
  );

  return {
    preferences,
    getProviderPreferences,
    updatePreferences,
    updateProviderPreferences,
  };
}
