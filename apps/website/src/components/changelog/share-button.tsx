"use client";

import { useCallback, useState } from "react";
import { analytics } from "@/lib/analytics";

interface ShareButtonProps {
  version: string;
}

export function ShareButton({ version }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    analytics.changelogShareClicked(version);
    setTimeout(() => setCopied(false), 2000);
  }, [version]);

  return (
    <button
      className="ml-auto flex items-center gap-1 text-muted-foreground text-xs transition-colors hover:text-foreground"
      onClick={copy}
      type="button"
    >
      {copied ? (
        <>
          <svg
            aria-hidden="true"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            viewBox="0 0 24 24"
          >
            <path d="M5 13l4 4L19 7" />
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg
            aria-hidden="true"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            viewBox="0 0 24 24"
          >
            <path d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m9.07-9.07 1.757-1.757a4.5 4.5 0 0 1 6.364 6.364l-4.5 4.5a4.5 4.5 0 0 1-7.244-1.242" />
          </svg>
          Share
        </>
      )}
    </button>
  );
}
