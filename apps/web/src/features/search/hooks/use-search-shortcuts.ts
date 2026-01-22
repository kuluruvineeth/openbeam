"use client";

import { useHotkeys } from "react-hotkeys-hook";
import type { SearchRanking } from "../lib/config";

type SearchShortcutsOptions = {
  setRanking: (ranking: SearchRanking) => void;
  advancedMode: boolean;
  toggleAdvancedMode: () => void;
  enabled?: boolean;
};

export function useSearchShortcuts({
  setRanking,
  advancedMode,
  toggleAdvancedMode,
  enabled = true,
}: SearchShortcutsOptions) {
  useHotkeys(
    "mod+1",
    (e) => {
      e.preventDefault();
      setRanking("bm25");
    },
    { enabled, enableOnFormTags: false }
  );

  useHotkeys(
    "mod+2",
    (e) => {
      e.preventDefault();
      setRanking("semantic");
    },
    { enabled, enableOnFormTags: false }
  );

  useHotkeys(
    "mod+3",
    (e) => {
      e.preventDefault();
      setRanking("hybrid");
    },
    { enabled, enableOnFormTags: false }
  );

  useHotkeys(
    "mod+4",
    (e) => {
      e.preventDefault();
      setRanking("hybrid_v2");
    },
    { enabled, enableOnFormTags: false }
  );

  useHotkeys(
    "mod+shift+s",
    (e) => {
      e.preventDefault();
      toggleAdvancedMode();
    },
    { enabled, enableOnFormTags: false }
  );

  useHotkeys(
    "escape",
    () => {
      if (advancedMode) {
        toggleAdvancedMode();
      }
    },
    { enabled: enabled && advancedMode }
  );
}
