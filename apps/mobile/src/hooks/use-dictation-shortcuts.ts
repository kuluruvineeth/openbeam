import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { getIsTauri } from "@/constants/layout";
import type { DictationMode } from "@/stores/dictation-store";
import { getShortcutOs } from "@/utils/shortcut-platform";

const HOLD_THRESHOLD_MS = 300;

type UseDictationShortcutsOptions = {
  enabled: boolean;
  isRecording: boolean;
  onStart: (mode: Exclude<DictationMode, "idle">) => void;
  onStop: () => void;
  onCancel: () => void;
  onToggle: () => void;
};

export function useDictationShortcuts({
  enabled,
  isRecording,
  onStart,
  onStop,
  onCancel,
  onToggle,
}: UseDictationShortcutsOptions) {
  const isRecordingRef = useRef(isRecording);
  isRecordingRef.current = isRecording;

  const callbacksRef = useRef({ onStart, onStop, onCancel, onToggle });
  callbacksRef.current = { onStart, onStop, onCancel, onToggle };

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

    const isMac = getShortcutOs() === "mac";
    let spaceDownAt: number | null = null;
    let pttActive = false;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isRecordingRef.current) {
        e.preventDefault();
        callbacksRef.current.onCancel();
        return;
      }

      const modKey = isMac ? e.metaKey : e.ctrlKey;

      if (e.key === " " && modKey && !e.repeat) {
        e.preventDefault();
        spaceDownAt = Date.now();
        return;
      }

      if (e.key === "V" && e.shiftKey && (isMac ? e.metaKey : e.ctrlKey)) {
        e.preventDefault();
        callbacksRef.current.onToggle();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key !== " ") {
        return;
      }
      if (spaceDownAt === null) {
        return;
      }

      e.preventDefault();
      const heldMs = Date.now() - spaceDownAt;
      spaceDownAt = null;

      if (heldMs >= HOLD_THRESHOLD_MS) {
        if (pttActive) {
          pttActive = false;
          callbacksRef.current.onStop();
        }
      } else if (isRecordingRef.current) {
        callbacksRef.current.onStop();
      } else {
        callbacksRef.current.onStart("hands-free");
      }
    };

    const handleSpaceHold = () => {
      if (spaceDownAt === null) {
        return;
      }
      const heldMs = Date.now() - spaceDownAt;
      if (
        heldMs >= HOLD_THRESHOLD_MS &&
        !pttActive &&
        !isRecordingRef.current
      ) {
        pttActive = true;
        callbacksRef.current.onStart("ptt");
      }
    };

    const holdCheckInterval = setInterval(handleSpaceHold, 50);

    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("keyup", handleKeyUp, true);

    return () => {
      clearInterval(holdCheckInterval);
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("keyup", handleKeyUp, true);
    };
  }, [enabled]);
}
