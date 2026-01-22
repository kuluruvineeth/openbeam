"use client";

import { useCallback, useEffect, useMemo } from "react";

type ModifierKey = "meta" | "ctrl" | "alt" | "shift";

interface ShortcutConfig {
  key: string;
  modifiers?: ModifierKey[];
  callback: () => void;
  enabled?: boolean;
  preventDefault?: boolean;
  ignoreInputs?: boolean;
}

interface UseGlobalShortcutsOptions {
  enabled?: boolean;
}

const INPUT_ELEMENTS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

function isEditableElement(element: Element | null): boolean {
  if (!element) {
    return false;
  }
  if (INPUT_ELEMENTS.has(element.tagName)) {
    return true;
  }
  if (element.getAttribute("contenteditable") === "true") {
    return true;
  }
  return false;
}

function matchesModifiers(
  event: KeyboardEvent,
  modifiers: ModifierKey[]
): boolean {
  const expected = {
    meta: modifiers.includes("meta"),
    ctrl: modifiers.includes("ctrl"),
    alt: modifiers.includes("alt"),
    shift: modifiers.includes("shift"),
  };

  return (
    event.metaKey === expected.meta &&
    event.ctrlKey === expected.ctrl &&
    event.altKey === expected.alt &&
    event.shiftKey === expected.shift
  );
}

function normalizeKey(key: string): string {
  return key.toLowerCase();
}

function buildShortcutMap(shortcuts: ShortcutConfig[]) {
  const map = new Map<string, ShortcutConfig[]>();
  for (const shortcut of shortcuts) {
    if (shortcut.enabled === false) {
      continue;
    }
    const key = normalizeKey(shortcut.key);
    const existing = map.get(key) ?? [];
    map.set(key, [...existing, shortcut]);
  }
  return map;
}

function processShortcut(
  event: KeyboardEvent,
  shortcut: ShortcutConfig
): boolean {
  const modifiers = shortcut.modifiers ?? [];
  const ignoreInputs = shortcut.ignoreInputs ?? true;

  if (!matchesModifiers(event, modifiers)) {
    return false;
  }

  if (ignoreInputs && isEditableElement(document.activeElement)) {
    return false;
  }

  if (shortcut.preventDefault !== false) {
    event.preventDefault();
  }

  shortcut.callback();
  return true;
}

function useGlobalShortcuts(
  shortcuts: ShortcutConfig[],
  options: UseGlobalShortcutsOptions = {}
): void {
  const { enabled = true } = options;

  const shortcutMap = useMemo(() => buildShortcutMap(shortcuts), [shortcuts]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) {
        return;
      }

      const key = normalizeKey(event.key);
      const matchingShortcuts = shortcutMap.get(key);

      if (!matchingShortcuts) {
        return;
      }

      for (const shortcut of matchingShortcuts) {
        if (processShortcut(event, shortcut)) {
          return;
        }
      }
    },
    [enabled, shortcutMap]
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, handleKeyDown]);
}

export type { ModifierKey, ShortcutConfig, UseGlobalShortcutsOptions };
export {
  buildShortcutMap,
  isEditableElement,
  matchesModifiers,
  normalizeKey,
  processShortcut,
  useGlobalShortcuts,
};
