"use client";

import { useCallback, useEffect, useState } from "react";

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

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        event.stopPropagation();
        toggle();
      }

      if (event.key === "Escape" && isOpen) {
        event.preventDefault();
        close();
      }
    };

    document.addEventListener("keydown", handleKeyDown, { capture: true });
    return () =>
      document.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [enabled, isOpen, toggle, close]);

  return {
    isOpen,
    setIsOpen,
    open,
    close,
    toggle,
  };
}
