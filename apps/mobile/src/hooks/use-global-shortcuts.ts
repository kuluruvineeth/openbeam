import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { getIsTauri } from "@/constants/layout";
import { getShortcutOs } from "@/utils/shortcut-platform";
import type { TauriGlobalShortcutModule } from "@/utils/tauri";
import { getTauri } from "@/utils/tauri";
import { focusMainWindow } from "@/utils/tauri-window";

type ShortcutEvent = {
  shortcut: string;
  id: number;
  state: "Pressed" | "Released";
};

type GlobalShortcutCallbacks = {
  onPttDown: () => void;
  onPttUp: () => void;
  onToggleRecording: () => void;
  onPasteLastTranscript: () => void;
};

type UseGlobalShortcutsOptions = {
  enabled: boolean;
  callbacks: GlobalShortcutCallbacks;
};

const MAC_SHORTCUTS = {
  ptt: "CommandOrControl+Shift+D",
  toggleRecording: "CommandOrControl+Shift+Space",
  pasteLastTranscript: "CommandOrControl+Shift+V",
} as const;

const NON_MAC_SHORTCUTS = {
  ptt: "Control+Shift+D",
  toggleRecording: "Control+Shift+Space",
  pasteLastTranscript: "Control+Shift+V",
} as const;

function getShortcutMap() {
  return getShortcutOs() === "mac" ? MAC_SHORTCUTS : NON_MAC_SHORTCUTS;
}

function getGlobalShortcutApi(): TauriGlobalShortcutModule | null {
  const tauri = getTauri();
  if (!tauri?.globalShortcut) {
    return null;
  }
  return tauri.globalShortcut;
}

export function useGlobalShortcuts({
  enabled,
  callbacks,
}: UseGlobalShortcutsOptions) {
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  useEffect(() => {
    if (!enabled) {
      return;
    }
    if (Platform.OS !== "web") {
      return;
    }
    if (!getIsTauri()) {
      return;
    }

    const api = getGlobalShortcutApi();
    if (!api?.register) {
      return;
    }

    const shortcuts = getShortcutMap();
    const registeredShortcuts: string[] = [];
    let disposed = false;

    async function registerAll() {
      const register = api?.register;
      if (!register || disposed) {
        return;
      }

      const handler = (event: ShortcutEvent) => {
        if (disposed) {
          return;
        }

        if (event.shortcut === shortcuts.ptt) {
          if (event.state === "Pressed") {
            focusMainWindow();
            callbacksRef.current.onPttDown();
          } else {
            callbacksRef.current.onPttUp();
          }
          return;
        }

        if (event.state !== "Pressed") {
          return;
        }

        if (event.shortcut === shortcuts.toggleRecording) {
          focusMainWindow();
          callbacksRef.current.onToggleRecording();
        } else if (event.shortcut === shortcuts.pasteLastTranscript) {
          callbacksRef.current.onPasteLastTranscript();
        }
      };

      for (const shortcut of Object.values(shortcuts)) {
        try {
          await register(shortcut, handler);
          registeredShortcuts.push(shortcut);
        } catch (err) {
          console.warn(
            `[GlobalShortcuts] Failed to register ${shortcut}:`,
            err
          );
        }
      }
    }

    async function cleanup() {
      const unregister = api?.unregister;
      if (!unregister) {
        return;
      }

      for (const shortcut of registeredShortcuts) {
        try {
          await unregister(shortcut);
        } catch {
          // Best-effort cleanup
        }
      }
      registeredShortcuts.length = 0;
    }

    // biome-ignore lint/complexity/noVoid: fire-and-forget async call
    void registerAll();

    return () => {
      disposed = true;
      // biome-ignore lint/complexity/noVoid: fire-and-forget async call
      void cleanup();
    };
  }, [enabled]);
}

export function getGlobalShortcutLabel(
  kind: "ptt" | "toggleRecording" | "pasteLastTranscript"
): string {
  const shortcuts = getShortcutMap();
  return shortcuts[kind].replace(
    /CommandOrControl/g,
    getShortcutOs() === "mac" ? "Cmd" : "Ctrl"
  );
}
