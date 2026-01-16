"use client";

import { useCallback, useEffect, useRef } from "react";
import { AGENT_UI_CONSTANTS } from "../lib/agent-constants";

type UseAutoScrollOptions = {
  isActive?: boolean;
  threshold?: number;
  behavior?: ScrollBehavior;
};

type UseAutoScrollReturn = {
  containerRef: React.RefObject<HTMLElement | null>;
  scrollToBottom: () => void;
  isNearBottom: () => boolean;
};

export function useAutoScroll({
  isActive = false,
  threshold = AGENT_UI_CONSTANTS.SCROLL_THRESHOLD,
  behavior = "smooth",
}: UseAutoScrollOptions = {}): UseAutoScrollReturn {
  const containerRef = useRef<HTMLElement | null>(null);
  const userScrolledRef = useRef(false);

  const isNearBottom = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      return true;
    }
    const { scrollTop, scrollHeight, clientHeight } = container;
    return scrollHeight - scrollTop - clientHeight < threshold;
  }, [threshold]);

  const scrollToBottom = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    container.scrollTo({
      top: container.scrollHeight,
      behavior,
    });
  }, [behavior]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const handleScroll = () => {
      userScrolledRef.current = !isNearBottom();
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [isNearBottom]);

  useEffect(() => {
    if (!isActive) {
      userScrolledRef.current = false;
      return;
    }

    if (!userScrolledRef.current) {
      scrollToBottom();
    }
  }, [isActive, scrollToBottom]);

  return { containerRef, scrollToBottom, isNearBottom };
}
