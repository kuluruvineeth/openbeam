"use client";

import { useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

type UseMissionShortcutsOptions = {
  enabled?: boolean;
  onCreateMission: () => void;
  onOpenPalette: () => void;
  onShowShortcuts: () => void;
};

export function useMissionShortcuts({
  enabled = true,
  onCreateMission,
  onOpenPalette,
  onShowShortcuts,
}: UseMissionShortcutsOptions) {
  const [isPaletteOpen, setPaletteOpen] = useState(false);
  const [isShortcutsOpen, setShortcutsOpen] = useState(false);

  useHotkeys(
    "mod+k",
    (e) => {
      e.preventDefault();
      setPaletteOpen(true);
      onOpenPalette();
    },
    { enabled }
  );

  useHotkeys(
    "mod+n",
    (e) => {
      e.preventDefault();
      onCreateMission();
    },
    { enabled }
  );

  useHotkeys(
    "shift+/",
    () => {
      setShortcutsOpen(true);
      onShowShortcuts();
    },
    { enabled }
  );

  return { isPaletteOpen, setPaletteOpen, isShortcutsOpen, setShortcutsOpen };
}
