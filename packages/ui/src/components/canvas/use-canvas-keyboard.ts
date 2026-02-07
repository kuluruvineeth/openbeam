"use client";

import { useCallback, useEffect } from "react";

type CanvasTool = "select" | "pan" | "add";

export interface CanvasKeyboardActions {
  onUndo?: () => void;
  onRedo?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onSelectAll?: () => void;
  onEscape?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onFitView?: () => void;
  onToggleGrid?: () => void;
  onToggleLock?: () => void;
  onToolChange?: (tool: CanvasTool) => void;
  onOpenQuickAdd?: () => void;
  onSave?: () => void;
  onRun?: () => void;
}

export interface UseCanvasKeyboardOptions extends CanvasKeyboardActions {
  enabled?: boolean;
  hasSelection?: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
}

function isInputElement(target: EventTarget | null): boolean {
  if (!(target && target instanceof HTMLElement)) {
    return false;
  }
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable ||
    target.closest("[role='textbox']") !== null ||
    target.closest("[contenteditable='true']") !== null
  );
}

export function useCanvasKeyboard({
  enabled = true,
  hasSelection = false,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onCopy,
  onPaste,
  onDuplicate,
  onDelete,
  onSelectAll,
  onEscape,
  onZoomIn,
  onZoomOut,
  onFitView,
  onToggleGrid,
  onToggleLock,
  onToolChange,
  onOpenQuickAdd,
  onSave,
  onRun,
}: UseCanvasKeyboardOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) {
        return;
      }

      const isInput = isInputElement(e.target);
      const isMod = e.metaKey || e.ctrlKey;

      if (isMod && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) {
          onUndo?.();
        }
        return;
      }

      if (isMod && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        if (canRedo) {
          onRedo?.();
        }
        return;
      }

      if (isMod && e.key === "y") {
        e.preventDefault();
        if (canRedo) {
          onRedo?.();
        }
        return;
      }

      if (isMod && e.key === "s") {
        e.preventDefault();
        onSave?.();
        return;
      }

      if (isMod && e.shiftKey && e.key === "Enter") {
        e.preventDefault();
        onRun?.();
        return;
      }

      if (isInput) {
        return;
      }

      if (isMod && e.key === "c") {
        e.preventDefault();
        if (hasSelection) {
          onCopy?.();
        }
        return;
      }

      if (isMod && e.key === "v") {
        e.preventDefault();
        onPaste?.();
        return;
      }

      if (isMod && e.key === "d") {
        e.preventDefault();
        if (hasSelection) {
          onDuplicate?.();
        }
        return;
      }

      if (isMod && e.key === "a") {
        e.preventDefault();
        onSelectAll?.();
        return;
      }

      if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        if (hasSelection) {
          onDelete?.();
        }
        return;
      }

      if (e.key === "Escape") {
        onEscape?.();
        return;
      }

      if (e.key === "v" && !isMod) {
        e.preventDefault();
        onToolChange?.("select");
        return;
      }

      if (e.key === "h" && !isMod) {
        e.preventDefault();
        onToolChange?.("pan");
        return;
      }

      if (e.key === "a" && !isMod) {
        e.preventDefault();
        onOpenQuickAdd?.();
        return;
      }

      if ((e.key === "+" || e.key === "=") && !isMod) {
        e.preventDefault();
        onZoomIn?.();
        return;
      }

      if (e.key === "-" && !isMod) {
        e.preventDefault();
        onZoomOut?.();
        return;
      }

      if (e.key === "f" && !isMod) {
        e.preventDefault();
        onFitView?.();
        return;
      }

      if (e.key === "g" && !isMod) {
        e.preventDefault();
        onToggleGrid?.();
        return;
      }

      if (isMod && e.key === "l") {
        e.preventDefault();
        onToggleLock?.();
        return;
      }
    },
    [
      enabled,
      hasSelection,
      canUndo,
      canRedo,
      onUndo,
      onRedo,
      onCopy,
      onPaste,
      onDuplicate,
      onDelete,
      onSelectAll,
      onEscape,
      onZoomIn,
      onZoomOut,
      onFitView,
      onToggleGrid,
      onToggleLock,
      onToolChange,
      onOpenQuickAdd,
      onSave,
      onRun,
    ]
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [enabled, handleKeyDown]);
}

export const CANVAS_KEYBOARD_SHORTCUTS = [
  { key: "V", description: "Select tool", category: "Tools" },
  { key: "H", description: "Pan tool", category: "Tools" },
  { key: "A", description: "Add node", category: "Tools" },
  { key: "⌘Z", description: "Undo", category: "Edit" },
  { key: "⌘⇧Z", description: "Redo", category: "Edit" },
  { key: "⌘C", description: "Copy", category: "Edit" },
  { key: "⌘V", description: "Paste", category: "Edit" },
  { key: "⌘D", description: "Duplicate", category: "Edit" },
  { key: "⌫", description: "Delete", category: "Edit" },
  { key: "⌘A", description: "Select all", category: "Edit" },
  { key: "Esc", description: "Deselect", category: "Edit" },
  { key: "+", description: "Zoom in", category: "View" },
  { key: "-", description: "Zoom out", category: "View" },
  { key: "F", description: "Fit view", category: "View" },
  { key: "G", description: "Toggle grid", category: "View" },
  { key: "⌘L", description: "Lock canvas", category: "View" },
  { key: "⌘S", description: "Save", category: "Actions" },
  { key: "⌘⇧↵", description: "Run workflow", category: "Actions" },
] as const;

export type CanvasShortcut = (typeof CANVAS_KEYBOARD_SHORTCUTS)[number];
