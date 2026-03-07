"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "openbeam-daemon-settings";

export interface AppSettings {
  theme: "dark" | "light" | "auto";
}

const DEFAULT_SETTINGS: AppSettings = { theme: "dark" };

function readSettings(): AppSettings {
  if (typeof window === "undefined") {
    return DEFAULT_SETTINGS;
  }
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return DEFAULT_SETTINGS;
  }
  const parsed = JSON.parse(stored) as Partial<AppSettings>;
  return { ...DEFAULT_SETTINGS, ...parsed };
}

let cachedSettings = DEFAULT_SETTINGS;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): AppSettings {
  return cachedSettings;
}

function getServerSnapshot(): AppSettings {
  return DEFAULT_SETTINGS;
}

function notifyListeners(): void {
  for (const listener of listeners) {
    listener();
  }
}

if (typeof window !== "undefined") {
  cachedSettings = readSettings();
}

export interface UseAppSettingsReturn {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

export function useAppSettings(): UseAppSettingsReturn {
  const settings = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    cachedSettings = { ...cachedSettings, ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedSettings));
    notifyListeners();
  }, []);

  const resetSettings = useCallback(() => {
    cachedSettings = { ...DEFAULT_SETTINGS };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedSettings));
    notifyListeners();
  }, []);

  return { settings, updateSettings, resetSettings };
}

export const useSettings = useAppSettings;
