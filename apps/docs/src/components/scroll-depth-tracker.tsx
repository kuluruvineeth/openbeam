"use client";

import { usePathname } from "next/navigation";
import posthog from "posthog-js";
import { useEffect, useRef } from "react";

const THRESHOLDS = [25, 50, 75, 100] as const;
const THROTTLE_MS = 200;

export function ScrollDepthTracker() {
  const pathname = usePathname();
  const firedRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    firedRef.current = new Set();
  }, [pathname]);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const handler = () => {
      if (timeout) {
        return;
      }
      timeout = setTimeout(() => {
        timeout = null;
        const scrollTop = window.scrollY;
        const docHeight =
          document.documentElement.scrollHeight - window.innerHeight;
        if (docHeight <= 0) {
          return;
        }

        const percent = Math.round((scrollTop / docHeight) * 100);

        for (const threshold of THRESHOLDS) {
          if (percent >= threshold && !firedRef.current.has(threshold)) {
            firedRef.current.add(threshold);
            posthog.capture("doc_scroll_depth", {
              depth: threshold,
              page: pathname,
            });
          }
        }
      }, THROTTLE_MS);
    };

    window.addEventListener("scroll", handler, { passive: true });
    return () => {
      window.removeEventListener("scroll", handler);
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [pathname]);

  return null;
}
