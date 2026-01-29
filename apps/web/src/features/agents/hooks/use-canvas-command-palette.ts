"use client";

import { useCallback, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

interface UseCanvasCommandPaletteOptions {
  enabled?: boolean;
}

export function useCanvasCommandPalette(
  options: UseCanvasCommandPaletteOptions = {}
) {
  const { enabled = true } = options;
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  useHotkeys(
    "mod+k",
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggle();
    },
    { enabled, enableOnFormTags: true }
  );

  useHotkeys(
    "escape",
    (e) => {
      e.preventDefault();
      close();
    },
    { enabled: enabled && isOpen }
  );

  return {
    isOpen,
    setIsOpen,
    open,
    close,
    toggle,
  };
}
