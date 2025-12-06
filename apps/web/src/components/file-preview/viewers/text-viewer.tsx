"use client";

import { useEffect, useState } from "react";
import { Icons } from "@/components/icons";

type TextViewerProps = {
  url: string;
  fileName: string;
  mimeType: string;
};

export function TextViewer({ url, fileName, mimeType }: TextViewerProps) {
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isCode =
    mimeType === "application/json" ||
    mimeType === "application/xml" ||
    mimeType === "text/xml" ||
    fileName.endsWith(".json") ||
    fileName.endsWith(".xml") ||
    fileName.endsWith(".html") ||
    fileName.endsWith(".css") ||
    fileName.endsWith(".js") ||
    fileName.endsWith(".ts") ||
    fileName.endsWith(".jsx") ||
    fileName.endsWith(".tsx");

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to load: ${response.status}`);
        }

        const text = await response.text();

        // Limit content size for performance
        const MAX_SIZE = 500_000; // 500KB
        if (text.length > MAX_SIZE) {
          setContent(
            `${text.slice(0, MAX_SIZE)}\n\n... [Content truncated - file too large to display] ...`
          );
        } else {
          setContent(text);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load content");
      } finally {
        setIsLoading(false);
      }
    };

    fetchContent();
  }, [url]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="size-6 animate-spin rounded-full border-2 border-foreground/10 border-t-foreground/40" />
          <p className="text-foreground/40 text-xs">Loading content...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <Icons.AlertCircle className="text-destructive/50" size={24} />
          <p className="text-foreground/50 text-sm">Failed to load content</p>
          <p className="font-mono text-[10px] text-foreground/30">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-foreground/[0.02]">
      <pre
        className={`min-h-full whitespace-pre-wrap break-words p-4 text-foreground/80 ${
          isCode
            ? "font-mono text-xs leading-relaxed"
            : "text-sm leading-relaxed"
        }`}
      >
        {content}
      </pre>
    </div>
  );
}
