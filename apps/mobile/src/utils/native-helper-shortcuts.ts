import { Platform } from "react-native";

export type NativeHelperShortcutConfig = {
  pushToTalk: number[];
  toggleRecording: number[];
  pasteLastTranscript: number[];
  newNote: number[];
};

export type NativeHelperShortcutKind = keyof NativeHelperShortcutConfig;

export type NativeHelperShortcutAction =
  | { type: "ptt-state-changed"; isPressed: boolean }
  | { type: "toggle-recording-triggered" }
  | { type: "paste-last-transcript-triggered" }
  | { type: "open-notes-window-triggered" };

type ExactMatchState = {
  toggleRecording: boolean;
  pasteLastTranscript: boolean;
  newNote: boolean;
};

const MAC_SHORTCUTS: NativeHelperShortcutConfig = {
  pushToTalk: [63],
  toggleRecording: [63, 49],
  pasteLastTranscript: [55, 59, 9],
  newNote: [55, 59, 45],
};

const WINDOWS_SHORTCUTS: NativeHelperShortcutConfig = {
  pushToTalk: [0x11, 0x5b],
  toggleRecording: [0x11, 0x5b, 0x20],
  pasteLastTranscript: [0x12, 0x10, 0x5a],
  newNote: [0x12, 0x10, 0x4e],
};

const MAC_KEY_LABELS = new Map<number, string>([
  [49, "Space"],
  [55, "Cmd"],
  [59, "Ctrl"],
  [63, "Fn"],
]);

const WINDOWS_KEY_LABELS = new Map<number, string>([
  [16, "Shift"],
  [17, "Ctrl"],
  [18, "Alt"],
  [32, "Space"],
  [91, "Meta"],
]);

export function normalizeNativeHelperShortcutKeys(keys: number[]): number[] {
  return Array.from(
    new Set(
      keys
        .filter((value) => Number.isInteger(value))
        // biome-ignore lint/suspicious/noBitwiseOperators: intentional bitwise truncation
        .map((value) => value | 0)
    )
  );
}

export function normalizeNativeHelperShortcutConfig(
  config: NativeHelperShortcutConfig
): NativeHelperShortcutConfig {
  return {
    pushToTalk: normalizeNativeHelperShortcutKeys(config.pushToTalk),
    toggleRecording: normalizeNativeHelperShortcutKeys(config.toggleRecording),
    pasteLastTranscript: normalizeNativeHelperShortcutKeys(
      config.pasteLastTranscript
    ),
    newNote: normalizeNativeHelperShortcutKeys(config.newNote),
  };
}

function isWebMacPlatform(): boolean {
  if (Platform.OS !== "web") {
    return false;
  }
  if (typeof navigator === "undefined") {
    return false;
  }

  const platform = String((navigator as { platform?: unknown }).platform ?? "");
  const userAgent = String(
    (navigator as { userAgent?: unknown }).userAgent ?? ""
  );
  return (
    // biome-ignore lint/performance/useTopLevelRegex: scoped regex acceptable here
    /Mac|iPhone|iPad|iPod/i.test(platform) ||
    // biome-ignore lint/performance/useTopLevelRegex: scoped regex acceptable here
    /Macintosh|Mac OS X/i.test(userAgent)
  );
}

export function getDefaultNativeHelperShortcutConfig(options?: {
  isMac?: boolean;
}): NativeHelperShortcutConfig {
  const isMac = options?.isMac ?? isWebMacPlatform();
  const source = isMac ? MAC_SHORTCUTS : WINDOWS_SHORTCUTS;
  return {
    pushToTalk: [...source.pushToTalk],
    toggleRecording: [...source.toggleRecording],
    pasteLastTranscript: [...source.pasteLastTranscript],
    newNote: [...source.newNote],
  };
}

function normalizeShortcutField(value: unknown, fallback: number[]): number[] {
  if (!Array.isArray(value)) {
    return normalizeNativeHelperShortcutKeys(fallback);
  }

  const numericValues = value.filter(
    (entry): entry is number => typeof entry === "number"
  );
  const normalized = normalizeNativeHelperShortcutKeys(numericValues);
  if (normalized.length === 0) {
    return normalizeNativeHelperShortcutKeys(fallback);
  }
  return normalized;
}

export function coerceNativeHelperShortcutConfig(
  value: unknown,
  options?: {
    fallback?: NativeHelperShortcutConfig;
  }
): NativeHelperShortcutConfig {
  const fallback =
    options?.fallback != null
      ? normalizeNativeHelperShortcutConfig(options.fallback)
      : getDefaultNativeHelperShortcutConfig();
  const candidate = (
    typeof value === "object" && value !== null ? value : {}
  ) as Partial<Record<NativeHelperShortcutKind, unknown>>;

  return {
    pushToTalk: normalizeShortcutField(
      candidate.pushToTalk,
      fallback.pushToTalk
    ),
    toggleRecording: normalizeShortcutField(
      candidate.toggleRecording,
      fallback.toggleRecording
    ),
    pasteLastTranscript: normalizeShortcutField(
      candidate.pasteLastTranscript,
      fallback.pasteLastTranscript
    ),
    newNote: normalizeShortcutField(candidate.newNote, fallback.newNote),
  };
}

function resolveKeyLabel(
  keyCode: number,
  options?: {
    isMac?: boolean;
  }
): string {
  const isMac = options?.isMac ?? isWebMacPlatform();
  const labels = isMac ? MAC_KEY_LABELS : WINDOWS_KEY_LABELS;
  return labels.get(keyCode) ?? `Key ${keyCode}`;
}

export function formatNativeHelperShortcut(
  keys: number[],
  options?: {
    isMac?: boolean;
  }
): string {
  const normalized = normalizeNativeHelperShortcutKeys(keys);
  if (normalized.length === 0) {
    return "Not set";
  }
  return normalized
    .map((keyCode) => resolveKeyLabel(keyCode, options))
    .join(" + ");
}

export class NativeHelperShortcutStateMachine {
  private readonly activeKeys = new Map<number, number>();
  private readonly shortcuts: NativeHelperShortcutConfig;
  private pttPressed = false;
  private readonly exactMatchState: ExactMatchState = {
    toggleRecording: false,
    pasteLastTranscript: false,
    newNote: false,
  };

  constructor(config: NativeHelperShortcutConfig) {
    this.shortcuts = normalizeNativeHelperShortcutConfig(config);
  }

  // biome-ignore lint/style/useConsistentMemberAccessibility: class member accessibility
  public handleKeyDown(
    keyCode: number,
    timestamp = Date.now()
  ): NativeHelperShortcutAction[] {
    // biome-ignore lint/suspicious/noBitwiseOperators: intentional bitwise operation
    const normalizedKeyCode = keyCode | 0;
    this.activeKeys.set(normalizedKeyCode, timestamp);
    return this.checkShortcuts();
  }

  // biome-ignore lint/style/useConsistentMemberAccessibility: class member accessibility
  public handleKeyUp(keyCode: number): NativeHelperShortcutAction[] {
    // biome-ignore lint/suspicious/noBitwiseOperators: intentional bitwise operation
    const normalizedKeyCode = keyCode | 0;
    this.activeKeys.delete(normalizedKeyCode);
    return this.checkShortcuts();
  }

  // biome-ignore lint/style/useConsistentMemberAccessibility: class member accessibility
  public clearStaleKeys(
    staleKeyCodes: number[],
    requestStartedAt: number
  ): NativeHelperShortcutAction[] {
    let changed = false;
    for (const staleKeyCode of staleKeyCodes) {
      // biome-ignore lint/suspicious/noBitwiseOperators: intentional bitwise operation
      const normalizedKeyCode = staleKeyCode | 0;
      const keyTimestamp = this.activeKeys.get(normalizedKeyCode);
      if (typeof keyTimestamp !== "number") {
        continue;
      }
      if (keyTimestamp > requestStartedAt) {
        continue;
      }
      changed = true;
      this.activeKeys.delete(normalizedKeyCode);
    }

    if (!changed) {
      return [];
    }
    return this.checkShortcuts();
  }

  // biome-ignore lint/style/useConsistentMemberAccessibility: class member accessibility
  public reset(): NativeHelperShortcutAction[] {
    this.activeKeys.clear();
    return this.checkShortcuts();
  }

  // biome-ignore lint/style/useConsistentMemberAccessibility: class member accessibility
  public getActiveKeys(): number[] {
    return Array.from(this.activeKeys.keys());
  }

  private checkShortcuts(): NativeHelperShortcutAction[] {
    const actions: NativeHelperShortcutAction[] = [];
    const activeKeysList = this.getActiveKeys();

    const pttMatch = this.isSubsetMatch(
      this.shortcuts.pushToTalk,
      activeKeysList
    );
    if (pttMatch !== this.pttPressed) {
      this.pttPressed = pttMatch;
      actions.push({ type: "ptt-state-changed", isPressed: pttMatch });
    }

    const toggleMatch = this.isExactMatch(
      this.shortcuts.toggleRecording,
      activeKeysList
    );
    if (toggleMatch && !this.exactMatchState.toggleRecording) {
      actions.push({ type: "toggle-recording-triggered" });
    }
    this.exactMatchState.toggleRecording = toggleMatch;

    const pasteMatch = this.isExactMatch(
      this.shortcuts.pasteLastTranscript,
      activeKeysList
    );
    if (pasteMatch && !this.exactMatchState.pasteLastTranscript) {
      actions.push({ type: "paste-last-transcript-triggered" });
    }
    this.exactMatchState.pasteLastTranscript = pasteMatch;

    const newNoteMatch = this.isExactMatch(
      this.shortcuts.newNote,
      activeKeysList
    );
    if (newNoteMatch && !this.exactMatchState.newNote) {
      actions.push({ type: "open-notes-window-triggered" });
    }
    this.exactMatchState.newNote = newNoteMatch;

    return actions;
  }

  private isSubsetMatch(shortcut: number[], active: number[]): boolean {
    if (shortcut.length === 0) {
      return false;
    }
    return shortcut.every((keyCode) => active.includes(keyCode));
  }

  private isExactMatch(shortcut: number[], active: number[]): boolean {
    if (shortcut.length === 0) {
      return false;
    }
    return (
      shortcut.length === active.length &&
      shortcut.every((keyCode) => active.includes(keyCode))
    );
  }
}
