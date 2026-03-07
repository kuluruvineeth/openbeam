"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "openbeam-daemon-recent-paths";
const MAX_RECENT_PATHS = 3;

export interface UseRecentPathsReturn {
  recentPaths: string[];
  isLoading: boolean;
  addRecentPath: (path: string) => void;
  clearRecentPaths: () => void;
}

function loadFromStorage(): string[] {
  if (typeof window === "undefined") {
    return [];
  }
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return [];
  }
  const parsed = JSON.parse(stored) as unknown;
  return Array.isArray(parsed) ? (parsed as string[]) : [];
}

export function useRecentPaths(): UseRecentPathsReturn {
  const [recentPaths, setRecentPaths] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setRecentPaths(loadFromStorage());
    setIsLoading(false);
  }, []);

  const addRecentPath = useCallback(
    (path: string) => {
      const filtered = recentPaths.filter((p) => p !== path);
      const updated = [path, ...filtered].slice(0, MAX_RECENT_PATHS);
      setRecentPaths(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    },
    [recentPaths]
  );

  const clearRecentPaths = useCallback(() => {
    setRecentPaths([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { recentPaths, isLoading, addRecentPath, clearRecentPaths };
}
