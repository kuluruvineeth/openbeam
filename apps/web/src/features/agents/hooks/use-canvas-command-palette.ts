"use client";

import { useCallback, useMemo, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

export type CommandPaletteItem = {
  id: string;
  label: string;
  shortcut?: string;
  group?: string;
  onSelect: () => void;
};

export type UseCanvasCommandPaletteOptions = {
  enabled?: boolean;
  commands?: CommandPaletteItem[];
};

export type UseCanvasCommandPaletteReturn = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  open: () => void;
  close: () => void;
  toggle: () => void;
  commands: CommandPaletteItem[];
  filteredCommands: (query: string) => CommandPaletteItem[];
};

export function useCanvasCommandPalette(
  options: UseCanvasCommandPaletteOptions = {}
): UseCanvasCommandPaletteReturn {
  const { enabled = true, commands: providedCommands = [] } = options;
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

  const filteredCommands = useCallback(
    (query: string) => {
      if (!query) {
        return providedCommands;
      }
      const lower = query.toLowerCase();
      return providedCommands.filter((cmd) =>
        cmd.label.toLowerCase().includes(lower)
      );
    },
    [providedCommands]
  );

  return useMemo(
    () => ({
      isOpen,
      setIsOpen,
      open,
      close,
      toggle,
      commands: providedCommands,
      filteredCommands,
    }),
    [isOpen, open, close, toggle, providedCommands, filteredCommands]
  );
}
