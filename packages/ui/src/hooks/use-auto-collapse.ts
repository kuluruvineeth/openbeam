"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AGENT_UI_CONSTANTS } from "../lib/agent-constants";

type UseAutoCollapseOptions = {
  isActive?: boolean;
  autoExpand?: boolean;
  collapseDelay?: number;
  initialOpen?: boolean;
};

type UseAutoCollapseReturn = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggle: () => void;
  wasAutoExpanded: boolean;
};

export function useAutoCollapse({
  isActive = false,
  autoExpand = true,
  collapseDelay = AGENT_UI_CONSTANTS.THINKING_COLLAPSE_DELAY,
  initialOpen = false,
}: UseAutoCollapseOptions = {}): UseAutoCollapseReturn {
  const [isOpen, setIsOpenState] = useState(initialOpen);
  const wasAutoExpandedRef = useRef(false);
  const manuallyToggledRef = useRef(false);
  const prevActiveRef = useRef(isActive);

  const setIsOpen = useCallback((open: boolean) => {
    manuallyToggledRef.current = true;
    setIsOpenState(open);
  }, []);

  const toggle = useCallback(() => {
    manuallyToggledRef.current = true;
    setIsOpenState((prev) => !prev);
  }, []);

  useEffect(() => {
    const wasActive = prevActiveRef.current;
    prevActiveRef.current = isActive;

    if (autoExpand && isActive && !wasActive && !manuallyToggledRef.current) {
      setIsOpenState(true);
      wasAutoExpandedRef.current = true;
    }

    if (
      !isActive &&
      wasActive &&
      wasAutoExpandedRef.current &&
      !manuallyToggledRef.current
    ) {
      const timer = setTimeout(() => {
        setIsOpenState(false);
        wasAutoExpandedRef.current = false;
      }, collapseDelay);
      return () => clearTimeout(timer);
    }
  }, [isActive, autoExpand, collapseDelay]);

  useEffect(() => {
    if (!isActive) {
      manuallyToggledRef.current = false;
    }
  }, [isActive]);

  return {
    isOpen,
    setIsOpen,
    toggle,
    wasAutoExpanded: wasAutoExpandedRef.current,
  };
}
