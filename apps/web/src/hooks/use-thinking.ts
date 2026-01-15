"use client";

import { useCallback, useRef, useState } from "react";
import { EMPTY_THINKING_STATE, type ThinkingState } from "@/lib/thinking-types";

type UseThinkingReturn = {
  state: ThinkingState;
  append: (content: string) => void;
  start: () => void;
  stop: () => void;
  reset: () => void;
};

export function useThinking(): UseThinkingReturn {
  const [state, setState] = useState<ThinkingState>(EMPTY_THINKING_STATE);
  const contentRef = useRef("");

  const append = useCallback((content: string) => {
    contentRef.current += content;
    setState((prev) => ({
      ...prev,
      content: contentRef.current,
      isActive: true,
      startTime: prev.startTime ?? performance.now(),
    }));
  }, []);

  const start = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isActive: true,
      startTime: prev.startTime ?? performance.now(),
    }));
  }, []);

  const stop = useCallback(() => {
    setState((prev) => {
      const endTime = performance.now();
      const durationMs = prev.startTime ? endTime - prev.startTime : null;
      return {
        ...prev,
        isActive: false,
        endTime,
        durationMs,
      };
    });
  }, []);

  const reset = useCallback(() => {
    contentRef.current = "";
    setState(EMPTY_THINKING_STATE);
  }, []);

  return { state, append, start, stop, reset };
}
