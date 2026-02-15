"use client";

import { useCallback, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

const SEQUENCE_TIMEOUT_MS = 500;

type UseMissionKeySequencesOptions = {
  enabled: boolean;
  onTabChange: (tab: string) => void;
  onJumpToTop: () => void;
};

export function useMissionKeySequences({
  enabled,
  onTabChange,
  onJumpToTop,
}: UseMissionKeySequencesOptions) {
  const [prefix, setPrefix] = useState<"g" | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetPrefix = useCallback(() => {
    setPrefix(null);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const startSequence = useCallback(() => {
    setPrefix("g");
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(resetPrefix, SEQUENCE_TIMEOUT_MS);
  }, [resetPrefix]);

  useHotkeys("g", startSequence, { enabled: enabled && prefix === null });

  const handleSecondKey = useCallback(
    (tab: string) => {
      onTabChange(tab);
      resetPrefix();
    },
    [onTabChange, resetPrefix]
  );

  const handleJumpToTop = useCallback(() => {
    onJumpToTop();
    resetPrefix();
  }, [onJumpToTop, resetPrefix]);

  const isAwaitingSecond = enabled && prefix === "g";

  useHotkeys("t", () => handleSecondKey("timeline"), {
    enabled: isAwaitingSecond,
  });
  useHotkeys("a", () => handleSecondKey("agents"), {
    enabled: isAwaitingSecond,
  });
  useHotkeys("c", () => handleSecondKey("comms"), {
    enabled: isAwaitingSecond,
  });
  useHotkeys("p", () => handleSecondKey("approvals"), {
    enabled: isAwaitingSecond,
  });
  useHotkeys("k", () => handleSecondKey("tasks"), {
    enabled: isAwaitingSecond,
  });
  useHotkeys("f", () => handleSecondKey("artifacts"), {
    enabled: isAwaitingSecond,
  });
  useHotkeys("m", () => handleSecondKey("memory"), {
    enabled: isAwaitingSecond,
  });
  useHotkeys("r", () => handleSecondKey("reflection"), {
    enabled: isAwaitingSecond,
  });
  useHotkeys("b", () => handleSecondKey("budget"), {
    enabled: isAwaitingSecond,
  });
  useHotkeys("l", () => handleSecondKey("ledger"), {
    enabled: isAwaitingSecond,
  });
  useHotkeys("g", handleJumpToTop, { enabled: isAwaitingSecond });

  return { activePrefix: prefix };
}
