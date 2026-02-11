"use client";

import { useHotkeys } from "react-hotkeys-hook";

type CanvasTool =
  | "select"
  | "pan"
  | "add"
  | "draw"
  | "lasso"
  | "rectangle"
  | "eraser";

export interface CanvasKeyboardActions {
  onUndo?: () => void;
  onRedo?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onCut?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onSelectAll?: () => void;
  onEscape?: () => void;
  onGroup?: () => void;
  onUngroup?: () => void;
  onLayout?: () => void;
  onExportImage?: () => void;
  onTestNode?: () => void;
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
  canGroup?: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
  hasTestableSelection?: boolean;
}

const FORM_OPTIONS = {
  enableOnFormTags: true as const,
  enableOnContentEditable: true,
};

export function useCanvasKeyboard({
  enabled = true,
  hasSelection = false,
  canGroup = false,
  canUndo = false,
  canRedo = false,
  hasTestableSelection = false,
  onUndo,
  onRedo,
  onCopy,
  onPaste,
  onCut,
  onDuplicate,
  onDelete,
  onSelectAll,
  onEscape,
  onGroup,
  onUngroup,
  onLayout,
  onExportImage,
  onTestNode,
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
  useHotkeys(
    "mod+z",
    (e) => {
      e.preventDefault();
      if (canUndo) {
        onUndo?.();
      }
    },
    { enabled, ...FORM_OPTIONS },
    [canUndo, onUndo]
  );

  useHotkeys(
    "mod+shift+z",
    (e) => {
      e.preventDefault();
      if (canRedo) {
        onRedo?.();
      }
    },
    { enabled, ...FORM_OPTIONS },
    [canRedo, onRedo]
  );

  useHotkeys(
    "mod+y",
    (e) => {
      e.preventDefault();
      if (canRedo) {
        onRedo?.();
      }
    },
    { enabled, ...FORM_OPTIONS },
    [canRedo, onRedo]
  );

  useHotkeys(
    "mod+s",
    (e) => {
      e.preventDefault();
      onSave?.();
    },
    { enabled, ...FORM_OPTIONS },
    [onSave]
  );

  useHotkeys(
    "mod+shift+enter",
    (e) => {
      e.preventDefault();
      onRun?.();
    },
    { enabled, ...FORM_OPTIONS },
    [onRun]
  );

  useHotkeys(
    "mod+c",
    (e) => {
      e.preventDefault();
      if (hasSelection) {
        onCopy?.();
      }
    },
    { enabled },
    [hasSelection, onCopy]
  );

  useHotkeys(
    "mod+v",
    (e) => {
      e.preventDefault();
      onPaste?.();
    },
    { enabled },
    [onPaste]
  );

  useHotkeys(
    "mod+x",
    (e) => {
      e.preventDefault();
      if (hasSelection) {
        onCut?.();
      }
    },
    { enabled },
    [hasSelection, onCut]
  );

  useHotkeys(
    "mod+g",
    (e) => {
      e.preventDefault();
      if (canGroup) {
        onGroup?.();
      }
    },
    { enabled },
    [canGroup, onGroup]
  );

  useHotkeys(
    "mod+shift+g",
    (e) => {
      e.preventDefault();
      onUngroup?.();
    },
    { enabled },
    [onUngroup]
  );

  useHotkeys(
    "mod+shift+e",
    (e) => {
      e.preventDefault();
      onExportImage?.();
    },
    { enabled },
    [onExportImage]
  );

  useHotkeys(
    "mod+d",
    (e) => {
      e.preventDefault();
      if (hasSelection) {
        onDuplicate?.();
      }
    },
    { enabled },
    [hasSelection, onDuplicate]
  );

  useHotkeys(
    "mod+a",
    (e) => {
      e.preventDefault();
      onSelectAll?.();
    },
    { enabled },
    [onSelectAll]
  );

  useHotkeys(
    "mod+l",
    (e) => {
      e.preventDefault();
      onToggleLock?.();
    },
    { enabled },
    [onToggleLock]
  );

  useHotkeys(
    "backspace, delete",
    (e) => {
      e.preventDefault();
      if (hasSelection) {
        onDelete?.();
      }
    },
    { enabled },
    [hasSelection, onDelete]
  );

  useHotkeys("escape", () => onEscape?.(), { enabled }, [onEscape]);

  useHotkeys(
    "v",
    (e) => {
      e.preventDefault();
      onToolChange?.("select");
    },
    { enabled },
    [onToolChange]
  );

  useHotkeys(
    "h",
    (e) => {
      e.preventDefault();
      onToolChange?.("pan");
    },
    { enabled },
    [onToolChange]
  );

  useHotkeys(
    "a",
    (e) => {
      e.preventDefault();
      onOpenQuickAdd?.();
    },
    { enabled },
    [onOpenQuickAdd]
  );

  useHotkeys(
    "equal, plus",
    (e) => {
      e.preventDefault();
      onZoomIn?.();
    },
    { enabled },
    [onZoomIn]
  );

  useHotkeys(
    "minus",
    (e) => {
      e.preventDefault();
      onZoomOut?.();
    },
    { enabled },
    [onZoomOut]
  );

  useHotkeys(
    "f",
    (e) => {
      e.preventDefault();
      onFitView?.();
    },
    { enabled },
    [onFitView]
  );

  useHotkeys(
    "g",
    (e) => {
      e.preventDefault();
      onToggleGrid?.();
    },
    { enabled },
    [onToggleGrid]
  );

  useHotkeys(
    "l",
    (e) => {
      e.preventDefault();
      onLayout?.();
    },
    { enabled },
    [onLayout]
  );

  useHotkeys(
    "t",
    (e) => {
      e.preventDefault();
      if (hasTestableSelection) {
        onTestNode?.();
      }
    },
    { enabled },
    [hasTestableSelection, onTestNode]
  );

  useHotkeys(
    "d",
    (e) => {
      e.preventDefault();
      onToolChange?.("draw");
    },
    { enabled },
    [onToolChange]
  );

  useHotkeys(
    "r",
    (e) => {
      e.preventDefault();
      onToolChange?.("rectangle");
    },
    { enabled },
    [onToolChange]
  );

  useHotkeys(
    "e",
    (e) => {
      e.preventDefault();
      onToolChange?.("eraser");
    },
    { enabled },
    [onToolChange]
  );
}

export const CANVAS_KEYBOARD_SHORTCUTS = [
  { key: "V", description: "Select tool", category: "Tools" },
  { key: "H", description: "Pan tool", category: "Tools" },
  { key: "A", description: "Add node", category: "Tools" },
  { key: "D", description: "Draw tool", category: "Tools" },
  { key: "R", description: "Rectangle tool", category: "Tools" },
  { key: "E", description: "Eraser tool", category: "Tools" },
  { key: "⌘Z", description: "Undo", category: "Edit" },
  { key: "⌘⇧Z", description: "Redo", category: "Edit" },
  { key: "⌘C", description: "Copy", category: "Edit" },
  { key: "⌘V", description: "Paste", category: "Edit" },
  { key: "⌘X", description: "Cut", category: "Edit" },
  { key: "⌘D", description: "Duplicate", category: "Edit" },
  { key: "⌫", description: "Delete", category: "Edit" },
  { key: "⌘A", description: "Select all", category: "Edit" },
  { key: "⌘G", description: "Group nodes", category: "Edit" },
  { key: "⌘⇧G", description: "Ungroup", category: "Edit" },
  { key: "Esc", description: "Deselect", category: "Edit" },
  { key: "+", description: "Zoom in", category: "View" },
  { key: "-", description: "Zoom out", category: "View" },
  { key: "F", description: "Fit view", category: "View" },
  { key: "G", description: "Toggle grid", category: "View" },
  { key: "⌘L", description: "Lock canvas", category: "View" },
  { key: "L", description: "Auto layout", category: "Actions" },
  { key: "T", description: "Test node", category: "Actions" },
  { key: "⌘S", description: "Save", category: "Actions" },
  { key: "⌘⇧E", description: "Export image", category: "Actions" },
  { key: "⌘⇧↵", description: "Run workflow", category: "Actions" },
] as const;

export type CanvasShortcut = (typeof CANVAS_KEYBOARD_SHORTCUTS)[number];
