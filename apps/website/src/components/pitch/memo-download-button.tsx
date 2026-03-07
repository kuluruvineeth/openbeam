"use client";

import { analytics } from "@/lib/analytics";

export function MemoDownloadButton() {
  return (
    <button
      className="fixed top-6 right-6 z-50 rounded-md border border-border bg-card px-4 py-2 font-mono text-muted-foreground text-xs tracking-wider transition-colors hover:border-foreground/20 hover:text-foreground print:hidden"
      onClick={() => {
        analytics.memoDownloaded();
        window.print();
      }}
      type="button"
    >
      Save as PDF
    </button>
  );
}
