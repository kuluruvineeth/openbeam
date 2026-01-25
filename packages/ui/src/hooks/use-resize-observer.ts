"use client";

import { type RefObject, useEffect, useState } from "react";

export function useResizeObserver(
  elementRef: RefObject<Element | null>
): ResizeObserverEntry | undefined {
  const [entry, setEntry] = useState<ResizeObserverEntry>();

  useEffect(() => {
    const node = elementRef?.current;
    if (!node) {
      return;
    }

    const observer = new ResizeObserver(([observerEntry]) => {
      setEntry(observerEntry);
    });

    observer.observe(node);

    return () => observer.disconnect();
  }, [elementRef]);

  return entry;
}
