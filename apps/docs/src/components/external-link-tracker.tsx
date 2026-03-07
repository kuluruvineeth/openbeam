"use client";

import { usePathname } from "next/navigation";
import posthog from "posthog-js";
import { useEffect } from "react";

export function ExternalLinkTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a[href]");
      if (!anchor) {
        return;
      }

      const href = anchor.getAttribute("href");
      if (!href) {
        return;
      }

      try {
        const url = new URL(href, window.location.origin);
        if (url.origin === window.location.origin) {
          return;
        }

        posthog.capture("doc_external_link_clicked", {
          url: href,
          page: pathname,
        });
      } catch {
        return;
      }
    };

    document.addEventListener("click", handler, { passive: true });
    return () => {
      document.removeEventListener("click", handler);
    };
  }, [pathname]);

  return null;
}
