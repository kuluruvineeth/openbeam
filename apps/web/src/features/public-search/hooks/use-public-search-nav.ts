"use client";

import { useHotkeys } from "react-hotkeys-hook";
import type { PublicSearchHit } from "../lib/api";

type Options = {
  hits: PublicSearchHit[];
  selectedIndex: number;
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>;
  enabled?: boolean;
  onSelect?: (hit: PublicSearchHit, index: number) => void;
};

export function usePublicSearchNav({
  hits,
  selectedIndex,
  setSelectedIndex,
  enabled = true,
  onSelect,
}: Options) {
  const hasHits = hits.length > 0;

  useHotkeys(
    "down, j",
    (e) => {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, hits.length - 1));
    },
    { enabled: enabled && hasHits, enableOnFormTags: false }
  );

  useHotkeys(
    "up, k",
    (e) => {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    },
    { enabled: enabled && hasHits, enableOnFormTags: false }
  );

  useHotkeys(
    "enter",
    (e) => {
      e.preventDefault();
      const hit = hits[selectedIndex];
      if (hit) {
        onSelect?.(hit, selectedIndex);
      }
    },
    {
      enabled: enabled && hasHits && selectedIndex >= 0,
      enableOnFormTags: false,
    }
  );

  useHotkeys(
    "home",
    (e) => {
      e.preventDefault();
      setSelectedIndex(0);
    },
    { enabled: enabled && hasHits, enableOnFormTags: false }
  );

  useHotkeys(
    "end",
    (e) => {
      e.preventDefault();
      setSelectedIndex(hits.length - 1);
    },
    { enabled: enabled && hasHits, enableOnFormTags: false }
  );
}
