"use client";

import { usePathname } from "next/navigation";
import posthog from "posthog-js";
import { useEffect, useRef } from "react";

const MILESTONES = [30, 60, 120, 300] as const;
const TICK_INTERVAL_MS = 1000;

export function ReadingTimeTracker() {
  const pathname = usePathname();
  const elapsedRef = useRef(0);
  const firedRef = useRef<Set<number>>(new Set());
  const visibleRef = useRef(true);

  useEffect(() => {
    elapsedRef.current = 0;
    firedRef.current = new Set();
    visibleRef.current = !document.hidden;
  }, [pathname]);

  useEffect(() => {
    const onVisibility = () => {
      visibleRef.current = !document.hidden;
    };
    document.addEventListener("visibilitychange", onVisibility);

    const interval = setInterval(() => {
      if (!visibleRef.current) {
        return;
      }
      elapsedRef.current += 1;

      for (const milestone of MILESTONES) {
        if (
          elapsedRef.current >= milestone &&
          !firedRef.current.has(milestone)
        ) {
          firedRef.current.add(milestone);
          posthog.capture("doc_reading_time", {
            seconds: milestone,
            page: pathname,
          });
        }
      }
    }, TICK_INTERVAL_MS);

    const onUnload = () => {
      if (elapsedRef.current > 5) {
        posthog.capture("doc_reading_time", {
          seconds: elapsedRef.current,
          page: pathname,
          final: true,
        });
      }
    };

    window.addEventListener("beforeunload", onUnload);

    return () => {
      onUnload();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", onUnload);
      clearInterval(interval);
    };
  }, [pathname]);

  return null;
}
