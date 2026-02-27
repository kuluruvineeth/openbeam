"use client";

import { useCallback, useRef } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { HOLD_THRESHOLD_MS } from "../constants";
import { useVoiceStore } from "../stores/voice-store";
import { useVoiceSession } from "./use-voice-session";

export function useVoiceHotkey() {
  const mode = useVoiceStore((s) => s.mode);
  const { connect, disconnect } = useVoiceSession();
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHoldingRef = useRef(false);
  const keyDownTimeRef = useRef(0);

  const handleKeyDown = useCallback(() => {
    if (isHoldingRef.current) {
      return;
    }
    keyDownTimeRef.current = Date.now();

    holdTimerRef.current = setTimeout(() => {
      isHoldingRef.current = true;
      if (mode === "idle") {
        connect("dictation");
      }
    }, HOLD_THRESHOLD_MS);
  }, [mode, connect]);

  const handleKeyUp = useCallback(() => {
    const elapsed = Date.now() - keyDownTimeRef.current;

    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    if (isHoldingRef.current) {
      isHoldingRef.current = false;
      disconnect();
      return;
    }

    if (elapsed < HOLD_THRESHOLD_MS) {
      if (mode === "idle") {
        connect("action");
      } else {
        disconnect();
      }
    }
  }, [mode, connect, disconnect]);

  useHotkeys(
    "ctrl+space",
    (e) => {
      e.preventDefault();
      handleKeyDown();
    },
    {
      keydown: true,
      keyup: false,
      enableOnFormTags: true,
      enableOnContentEditable: true,
    }
  );

  useHotkeys(
    "ctrl+space",
    (e) => {
      e.preventDefault();
      handleKeyUp();
    },
    {
      keydown: false,
      keyup: true,
      enableOnFormTags: true,
      enableOnContentEditable: true,
    }
  );

  useHotkeys("mod+shift+v", () => {
    if (mode === "idle") {
      connect("dictation");
    } else {
      disconnect();
    }
  });

  useHotkeys("mod+shift+a", () => {
    if (mode === "idle") {
      connect("action");
    } else {
      disconnect();
    }
  });

  useHotkeys("escape", () => {
    if (mode !== "idle") {
      disconnect();
    }
  });
}
