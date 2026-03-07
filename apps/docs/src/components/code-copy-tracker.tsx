"use client";

import { usePathname } from "next/navigation";
import posthog from "posthog-js";
import { useEffect } from "react";

function detectLanguage(codeBlock: Element): string {
  const classes = codeBlock.className.split(" ");
  for (const cls of classes) {
    if (cls.startsWith("language-")) {
      return cls.slice("language-".length);
    }
  }
  return "unknown";
}

export function CodeCopyTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const button = target.closest(
        'button[aria-label="Copy Text"], button[aria-label="Copied Text"]'
      );
      if (!button) {
        return;
      }

      const figure = button.closest("figure");
      if (!figure) {
        return;
      }

      const codeEl =
        figure.querySelector("code[class*='language-']") ??
        figure.querySelector("pre code") ??
        figure.querySelector("code");

      const language = codeEl ? detectLanguage(codeEl) : "unknown";

      posthog.capture("doc_code_copied", {
        language,
        page: pathname,
      });
    };

    document.addEventListener("click", handler, { capture: true });
    return () => {
      document.removeEventListener("click", handler, { capture: true });
    };
  }, [pathname]);

  return null;
}
