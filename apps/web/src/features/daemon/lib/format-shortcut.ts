export type ShortcutKey =
  | "mod"
  | "shift"
  | "alt"
  | "ctrl"
  | "enter"
  | "backspace"
  | "escape"
  | "tab"
  | "space"
  | "up"
  | "down"
  | "left"
  | "right"
  | (string & {});

type ShortcutOs = "mac" | "non-mac";

const MAC_SYMBOLS: Record<string, string> = {
  mod: "⌘",
  shift: "⇧",
  alt: "⌥",
  ctrl: "⌃",
  enter: "↩",
  backspace: "⌫",
  escape: "⎋",
  tab: "⇥",
  space: "␣",
  up: "↑",
  down: "↓",
  left: "←",
  right: "→",
};

const NON_MAC_LABELS: Record<string, string> = {
  mod: "Ctrl",
  shift: "Shift",
  alt: "Alt",
  ctrl: "Ctrl",
  enter: "Enter",
  backspace: "Backspace",
  escape: "Esc",
  tab: "Tab",
  space: "Space",
  up: "Up",
  down: "Down",
  left: "Left",
  right: "Right",
};

function detectOs(): ShortcutOs {
  if (typeof navigator === "undefined") {
    return "non-mac";
  }
  return navigator.platform?.startsWith("Mac") ? "mac" : "non-mac";
}

export function formatShortcut(keys: ShortcutKey[], os?: ShortcutOs): string {
  const resolved = os ?? detectOs();

  if (resolved === "mac") {
    return keys.map((k) => MAC_SYMBOLS[k] ?? k.toUpperCase()).join("");
  }

  return keys.map((k) => NON_MAC_LABELS[k] ?? k.toUpperCase()).join("+");
}
