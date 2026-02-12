"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

interface UseTableScrollOptions {
  scrollAmount?: number;
  useColumnWidths?: boolean;
  startFromColumn?: number;
}

const SCROLL_EDGE_THRESHOLD_PX = 10;

export function useTableScroll(options: UseTableScrollOptions = {}) {
  const {
    scrollAmount = 120,
    useColumnWidths = false,
    startFromColumn = 0,
  } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isScrollable, setIsScrollable] = useState(false);
  const currentColumnIndex = useRef(startFromColumn);
  const isScrollingProgrammatically = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  const getColumnPositions = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      return [];
    }

    const tableEl = container.querySelector("table");
    if (!tableEl) {
      return [];
    }

    const headerRow = tableEl.querySelector("thead tr");
    if (!headerRow) {
      return [];
    }

    const columns = Array.from(headerRow.querySelectorAll("th"));
    const positions: number[] = [];
    let currentPosition = 0;

    for (const column of columns) {
      positions.push(currentPosition);
      currentPosition += (column as HTMLElement).offsetWidth;
    }

    return positions;
  }, []);

  const syncColumnIndex = useCallback(() => {
    const container = containerRef.current;
    if (
      !(container && useColumnWidths) ||
      isScrollingProgrammatically.current
    ) {
      return;
    }

    const allColumnPositions = getColumnPositions();
    if (allColumnPositions.length === 0) {
      return;
    }

    const currentScrollLeft = container.scrollLeft;
    const maxScrollLeft = container.scrollWidth - container.clientWidth;

    if (currentScrollLeft <= SCROLL_EDGE_THRESHOLD_PX) {
      currentColumnIndex.current = startFromColumn;
      return;
    }
    if (currentScrollLeft >= maxScrollLeft - SCROLL_EDGE_THRESHOLD_PX) {
      currentColumnIndex.current = allColumnPositions.length - 1;
      return;
    }

    let accumulatedDistance = 0;
    let detectedColumn = startFromColumn;

    for (let i = startFromColumn; i < allColumnPositions.length - 1; i++) {
      const columnStart = allColumnPositions[i] ?? 0;
      const columnEnd = allColumnPositions[i + 1] ?? 0;
      const columnWidth = columnEnd - columnStart;
      const nextDistance = accumulatedDistance + columnWidth;

      if (
        Math.abs(currentScrollLeft - accumulatedDistance) <=
        Math.abs(currentScrollLeft - nextDistance)
      ) {
        detectedColumn = i;
        break;
      }

      accumulatedDistance = nextDistance;
      detectedColumn = i + 1;
    }

    currentColumnIndex.current = Math.max(
      startFromColumn,
      Math.min(detectedColumn, allColumnPositions.length - 1)
    );
  }, [useColumnWidths, startFromColumn, getColumnPositions]);

  const checkScrollability = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const { scrollWidth, clientWidth } = container;
    const isScrollableTable = scrollWidth > clientWidth;

    if (useColumnWidths) {
      syncColumnIndex();

      const allColumnPositions = getColumnPositions();
      const maxColumnIndex = allColumnPositions.length - 1;

      const newCanScrollLeft =
        currentColumnIndex.current > startFromColumn ||
        container.scrollLeft > SCROLL_EDGE_THRESHOLD_PX;
      const newCanScrollRight = currentColumnIndex.current < maxColumnIndex;

      setIsScrollable(isScrollableTable);
      setCanScrollLeft(newCanScrollLeft);
      setCanScrollRight(newCanScrollRight);
    } else {
      const { scrollLeft: scrollLeftPos } = container;
      setIsScrollable(isScrollableTable);
      setCanScrollLeft(scrollLeftPos > 0);
      setCanScrollRight(scrollLeftPos < scrollWidth - clientWidth - 1);
    }
  }, [useColumnWidths, startFromColumn, getColumnPositions, syncColumnIndex]);

  const SMOOTH_SCROLL_SETTLE_MS = 500;
  const SCROLL_DEBOUNCE_MS = 100;

  const scrollLeft = useCallback(
    (smooth = true) => {
      const container = containerRef.current;
      if (!container) {
        return;
      }

      if (useColumnWidths) {
        const allColumnPositions = getColumnPositions();
        if (allColumnPositions.length === 0) {
          return;
        }

        if (
          currentColumnIndex.current <= startFromColumn &&
          container.scrollLeft <= 0
        ) {
          return;
        }

        if (
          currentColumnIndex.current <= startFromColumn &&
          container.scrollLeft > 0
        ) {
          isScrollingProgrammatically.current = true;
          container.scrollTo({ left: 0, behavior: "smooth" });

          setTimeout(() => {
            isScrollingProgrammatically.current = false;
            syncColumnIndex();
            checkScrollability();
          }, SMOOTH_SCROLL_SETTLE_MS);
          return;
        }

        const originalColumnIndex = currentColumnIndex.current;
        currentColumnIndex.current -= 1;

        const currentScrollLeft = container.scrollLeft;
        const maxScrollLeft = container.scrollWidth - container.clientWidth;

        let targetScrollLeft: number;

        if (
          Math.abs(currentScrollLeft - maxScrollLeft) < SCROLL_EDGE_THRESHOLD_PX
        ) {
          const lastColumnStart = allColumnPositions[originalColumnIndex] ?? 0;
          const lastColumnEnd =
            allColumnPositions[originalColumnIndex + 1] ??
            lastColumnStart + 150;
          const lastColumnWidth = lastColumnEnd - lastColumnStart;
          targetScrollLeft = Math.max(0, currentScrollLeft - lastColumnWidth);
        } else {
          targetScrollLeft = 0;
          for (let i = startFromColumn; i < currentColumnIndex.current; i++) {
            const columnStart = allColumnPositions[i] ?? 0;
            const columnEnd = allColumnPositions[i + 1] ?? 0;
            targetScrollLeft += columnEnd - columnStart;
          }
        }

        isScrollingProgrammatically.current = true;
        container.scrollTo({ left: targetScrollLeft, behavior: "smooth" });

        setTimeout(() => {
          isScrollingProgrammatically.current = false;
          syncColumnIndex();
          checkScrollability();
        }, SMOOTH_SCROLL_SETTLE_MS);
      } else {
        container.scrollBy({
          left: -scrollAmount,
          behavior: smooth ? "smooth" : "auto",
        });
      }
    },
    [
      scrollAmount,
      useColumnWidths,
      startFromColumn,
      getColumnPositions,
      syncColumnIndex,
      checkScrollability,
    ]
  );

  const scrollRight = useCallback(
    (smooth = true) => {
      const container = containerRef.current;
      if (!container) {
        return;
      }

      if (useColumnWidths) {
        const allColumnPositions = getColumnPositions();
        if (allColumnPositions.length === 0) {
          return;
        }
        const maxColumnIndex = allColumnPositions.length - 1;

        if (currentColumnIndex.current >= maxColumnIndex) {
          return;
        }

        currentColumnIndex.current += 1;
        isScrollingProgrammatically.current = true;

        if (currentColumnIndex.current === maxColumnIndex) {
          container.scrollTo({
            left: container.scrollWidth - container.clientWidth,
            behavior: "smooth",
          });
        } else {
          let targetScrollLeft = 0;
          for (let i = startFromColumn; i < currentColumnIndex.current; i++) {
            const columnStart = allColumnPositions[i] ?? 0;
            const columnEnd = allColumnPositions[i + 1] ?? 0;
            targetScrollLeft += columnEnd - columnStart;
          }
          container.scrollTo({ left: targetScrollLeft, behavior: "smooth" });
        }

        setTimeout(() => {
          isScrollingProgrammatically.current = false;
          syncColumnIndex();
          checkScrollability();
        }, SMOOTH_SCROLL_SETTLE_MS);
      } else {
        container.scrollBy({
          left: scrollAmount,
          behavior: smooth ? "smooth" : "auto",
        });
      }
    },
    [
      scrollAmount,
      useColumnWidths,
      startFromColumn,
      getColumnPositions,
      syncColumnIndex,
      checkScrollability,
    ]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    currentColumnIndex.current = startFromColumn;
    checkScrollability();

    const handleScroll = () => {
      if (isScrollingProgrammatically.current) {
        return;
      }

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        checkScrollability();
      }, SCROLL_DEBOUNCE_MS);
    };

    const handleResize = () => {
      currentColumnIndex.current = startFromColumn;
      checkScrollability();
    };

    container.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleResize);

    const resizeObserver = new ResizeObserver(() => {
      currentColumnIndex.current = startFromColumn;
      checkScrollability();
    });

    resizeObserver.observe(container);

    return () => {
      container.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      resizeObserver.disconnect();

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [checkScrollability, startFromColumn]);

  useHotkeys(
    "ArrowLeft, ArrowRight",
    (event) => {
      if (event.key === "ArrowLeft" && canScrollLeft) {
        scrollLeft();
      }
      if (event.key === "ArrowRight" && canScrollRight) {
        scrollRight();
      }
    },
    {
      enabled: isScrollable,
      preventDefault: true,
    }
  );

  return {
    containerRef,
    canScrollLeft,
    canScrollRight,
    isScrollable,
    scrollLeft,
    scrollRight,
  };
}
