"use client";

import { useCallback } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useCanvasStore } from "../stores/canvas-store";

export function useUndoRedo() {
  const temporalStore = useCanvasStore.temporal;
  const { undo, redo, pastStates, futureStates, pause, resume } =
    temporalStore.getState();

  const canUndo = pastStates.length > 0;
  const canRedo = futureStates.length > 0;

  const handleUndo = useCallback(() => {
    if (pastStates.length > 0) {
      undo();
    }
  }, [undo, pastStates.length]);

  const handleRedo = useCallback(() => {
    if (futureStates.length > 0) {
      redo();
    }
  }, [redo, futureStates.length]);

  useHotkeys("mod+z", (e: KeyboardEvent) => {
    e.preventDefault();
    handleUndo();
  });

  useHotkeys("mod+shift+z", (e: KeyboardEvent) => {
    e.preventDefault();
    handleRedo();
  });

  return {
    undo: handleUndo,
    redo: handleRedo,
    canUndo,
    canRedo,
    pause,
    resume,
  };
}
