"use client";

import { usePathname } from "next/navigation";
import posthog from "posthog-js";
import { useEffect } from "react";

const DOCS_PREFIX_RE = /^\/docs\/?/;

function extractSection(href: string): string {
  const parts = href.replace(DOCS_PREFIX_RE, "").split("/");
  return parts[0] || "root";
}

export function SidebarNavTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("#nd-sidebar a[href]");
      if (!anchor) {
        return;
      }

      const href = anchor.getAttribute("href");
      if (!href) {
        return;
      }

      posthog.capture("doc_sidebar_clicked", {
        section: extractSection(href),
        target: href,
        from: pathname,
      });
    };

    document.addEventListener("click", handler, { passive: true });
    return () => {
      document.removeEventListener("click", handler);
    };
  }, [pathname]);

  return null;
}
