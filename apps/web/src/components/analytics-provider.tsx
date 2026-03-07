"use client";

import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { PostHogProvider, usePostHog } from "posthog-js/react";
import { Suspense, useEffect } from "react";
import { env } from "@/env";

const POSTHOG_KEY = env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = env.NEXT_PUBLIC_POSTHOG_HOST;

if (typeof window !== "undefined" && POSTHOG_KEY) {
  posthog.init(POSTHOG_KEY, {
    api_host: "/ingest",
    ui_host: POSTHOG_HOST,
    person_profiles: "always",
    capture_pageview: false,
    capture_pageleave: true,
    autocapture: {
      dom_event_allowlist: ["click", "submit"],
      element_allowlist: ["a", "button", "form", "input", "select"],
      css_selector_allowlist: ["[data-ph-capture]"],
    },
    disable_session_recording: false,
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: "[data-ph-mask]",
    },
    loaded: (ph) => {
      if (process.env.NODE_ENV === "development") {
        ph.debug();
      }
    },
  });
}

function PageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ph = usePostHog();

  useEffect(() => {
    if (!(pathname && ph)) {
      return;
    }

    const url = searchParams?.size
      ? `${pathname}?${searchParams.toString()}`
      : pathname;

    ph.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams, ph]);

  return null;
}

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  if (!POSTHOG_KEY) {
    return <>{children}</>;
  }

  return (
    <PostHogProvider client={posthog}>
      <Suspense fallback={null}>
        <PageviewTracker />
      </Suspense>
      {children}
    </PostHogProvider>
  );
}
