"use client";

import { useCallback, useEffect, useState } from "react";

interface KeyboardNavigationOptions<T> {
  items: T[];
  onSelect?: (item: T, index: number) => void;
  onNavigate?: (item: T, index: number) => void;
  enabled?: boolean;
  loop?: boolean;
}

interface KeyHandlerContext {
  itemsLength: number;
  loop: boolean;
  focusedIndex: number;
  setFocusedIndex: React.Dispatch<React.SetStateAction<number>>;
  onSelect?: (index: number) => void;
}

function getNextIndex(current: number, length: number, loop: boolean): number {
  const next = current + 1;
  return next >= length ? (loop ? 0 : current) : next;
}

function getPreviousIndex(
  current: number,
  length: number,
  loop: boolean
): number {
  const prev = current - 1;
  return prev < 0 ? (loop ? length - 1 : 0) : prev;
}

function isInputElement(target: EventTarget | null): boolean {
  const tagName = (target as HTMLElement)?.tagName;
  return tagName === "INPUT" || tagName === "TEXTAREA";
}

function handleDownKey(e: KeyboardEvent, ctx: KeyHandlerContext): void {
  e.preventDefault();
  ctx.setFocusedIndex((prev) => getNextIndex(prev, ctx.itemsLength, ctx.loop));
}

function handleUpKey(e: KeyboardEvent, ctx: KeyHandlerContext): void {
  e.preventDefault();
  ctx.setFocusedIndex((prev) =>
    getPreviousIndex(prev, ctx.itemsLength, ctx.loop)
  );
}

function handleEnterKey(e: KeyboardEvent, ctx: KeyHandlerContext): void {
  if (ctx.focusedIndex >= 0 && ctx.focusedIndex < ctx.itemsLength) {
    e.preventDefault();
    ctx.onSelect?.(ctx.focusedIndex);
  }
}

function handleEscapeKey(ctx: KeyHandlerContext): void {
  ctx.setFocusedIndex(-1);
}

function getKeyHandler(
  key: string,
  isInput: boolean
): ((e: KeyboardEvent, ctx: KeyHandlerContext) => void) | null {
  if ((key === "ArrowDown" || key === "j") && !(isInput && key === "j")) {
    return handleDownKey;
  }
  if ((key === "ArrowUp" || key === "k") && !(isInput && key === "k")) {
    return handleUpKey;
  }
  if (key === "Enter" && !isInput) {
    return handleEnterKey;
  }
  if (key === "Escape") {
    return (_, ctx) => handleEscapeKey(ctx);
  }
  return null;
}

function useKeyboardNavigation<T>({
  items,
  onSelect,
  onNavigate,
  enabled = true,
  loop = true,
}: KeyboardNavigationOptions<T>) {
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled || items.length === 0) {
        return;
      }

      const isInput = isInputElement(e.target);
      const handler = getKeyHandler(e.key, isInput);

      if (handler) {
        const ctx: KeyHandlerContext = {
          itemsLength: items.length,
          loop,
          focusedIndex,
          setFocusedIndex,
          onSelect: onSelect
            ? (idx) => onSelect(items[idx] as T, idx)
            : undefined,
        };
        handler(e, ctx);
      }
    },
    [enabled, items, focusedIndex, loop, onSelect]
  );

  useEffect(() => {
    if (focusedIndex >= 0 && focusedIndex < items.length) {
      onNavigate?.(items[focusedIndex] as T, focusedIndex);
    }
  }, [focusedIndex, items, onNavigate]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return {
    focusedIndex,
    setFocusedIndex,
    isFocused: (index: number) => focusedIndex === index,
    reset: () => setFocusedIndex(-1),
  };
}

export { useKeyboardNavigation };
export type { KeyboardNavigationOptions };
