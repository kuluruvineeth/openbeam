export type AutocompleteOptionsPosition = "above-input" | "below-input";

function getNextActiveIndex(args: {
  currentIndex: number;
  itemCount: number;
  key: "ArrowDown" | "ArrowUp";
}): number {
  const { currentIndex, itemCount, key } = args;

  if (itemCount <= 0) {
    return -1;
  }

  if (currentIndex < 0) {
    return key === "ArrowDown" ? 0 : itemCount - 1;
  }

  const normalizedCurrent = currentIndex % itemCount;
  return key === "ArrowDown"
    ? (normalizedCurrent + 1) % itemCount
    : (normalizedCurrent - 1 + itemCount) % itemCount;
}

export function orderAutocompleteOptions<T>(
  options: readonly T[],
  position: AutocompleteOptionsPosition = "above-input"
): T[] {
  if (position === "below-input") {
    return [...options];
  }
  return [...options].reverse();
}

export function getAutocompleteFallbackIndex(
  itemCount: number,
  position: AutocompleteOptionsPosition = "above-input"
): number {
  if (itemCount <= 0) {
    return -1;
  }
  return position === "above-input" ? itemCount - 1 : 0;
}

export function getAutocompleteNextIndex(args: {
  currentIndex: number;
  itemCount: number;
  key: "ArrowDown" | "ArrowUp";
}): number {
  return getNextActiveIndex(args);
}

export function getAutocompleteScrollOffset(args: {
  currentOffset: number;
  viewportHeight: number;
  itemTop: number;
  itemHeight: number;
}): number {
  if (args.viewportHeight <= 0) {
    return args.currentOffset;
  }

  const itemBottom = args.itemTop + args.itemHeight;
  const viewportTop = args.currentOffset;
  const viewportBottom = args.currentOffset + args.viewportHeight;

  if (args.itemTop < viewportTop) {
    return Math.max(0, args.itemTop);
  }

  if (itemBottom > viewportBottom) {
    return Math.max(0, itemBottom - args.viewportHeight);
  }

  return args.currentOffset;
}
