"use client";

import posthog from "posthog-js";
import { useEffect, useRef } from "react";

const DEBOUNCE_MS = 800;

export function SearchTracker() {
  const lastQueryRef = useRef("");

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const handler = (e: Event) => {
      const input = e.target as HTMLInputElement;
      if (
        !input.matches(
          "[role='searchbox'], [type='search'], input[placeholder*='Search']"
        )
      ) {
        return;
      }

      const query = input.value.trim();
      if (!query || query === lastQueryRef.current) {
        return;
      }

      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(() => {
        lastQueryRef.current = query;
        posthog.capture("doc_search", {
          query,
          page: window.location.pathname,
        });
      }, DEBOUNCE_MS);
    };

    document.addEventListener("input", handler, { capture: true });
    return () => {
      document.removeEventListener("input", handler, { capture: true });
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, []);

  return null;
}
