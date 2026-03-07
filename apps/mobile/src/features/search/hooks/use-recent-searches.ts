import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "openbeam:recent-searches";
const MAX_RECENT = 10;

export function useRecentSearches() {
  const [searches, setSearches] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          setSearches(JSON.parse(raw));
        } catch {
          setSearches([]);
        }
      }
    });
  }, []);

  const persist = useCallback((updated: string[]) => {
    setSearches(updated);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, []);

  const addSearch = useCallback(
    (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) {
        return;
      }

      const filtered = searches.filter((s) => s !== trimmed);
      persist([trimmed, ...filtered].slice(0, MAX_RECENT));
    },
    [searches, persist]
  );

  const removeSearch = useCallback(
    (query: string) => {
      persist(searches.filter((s) => s !== query));
    },
    [searches, persist]
  );

  const clearSearches = useCallback(() => {
    persist([]);
  }, [persist]);

  return {
    searches,
    addSearch,
    removeSearch,
    clearSearches,
  };
}
