"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { analytics } from "@/lib/analytics";

const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

export function UtmTracker() {
  const searchParams = useSearchParams();
  const captured = useRef(false);

  useEffect(() => {
    if (captured.current) {
      return;
    }
    captured.current = true;

    const params: Record<string, string> = {};
    for (const key of UTM_KEYS) {
      const value = searchParams?.get(key);
      if (value) {
        params[key] = value;
      }
    }

    if (typeof document !== "undefined" && document.referrer) {
      params.referrer = document.referrer;
    }

    if (Object.keys(params).length > 0) {
      analytics.captureUtm(params);
    }
  }, [searchParams]);

  return null;
}
