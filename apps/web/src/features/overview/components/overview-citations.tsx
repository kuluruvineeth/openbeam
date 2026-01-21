"use client";

import { memo } from "react";
import { AppLogo } from "@/components/integrations/app-logo";
import { getConnectorApp } from "@/features/search/lib/display";
import { cn } from "@/lib/utils";
import type { OverviewCitation } from "../lib/overview-types";

type OverviewCitationsProps = {
  citations: OverviewCitation[];
  className?: string;
  compact?: boolean;
  onPreviewCitation?: (citation: OverviewCitation) => void;
};

function CitationPill({
  citation,
  compact,
  onPreview,
}: {
  citation: OverviewCitation;
  compact?: boolean;
  onPreview?: (citation: OverviewCitation) => void;
}) {
  const app = getConnectorApp(citation.connectorType ?? "");
  const displayTitle =
    citation.title.length > 40
      ? `${citation.title.slice(0, 40)}...`
      : citation.title;

  const content = (
    <div
      className={cn(
        "group flex items-center gap-1.5 rounded-sm border border-border/50 bg-background px-2 py-1 transition-colors hover:border-border hover:bg-accent/50",
        compact ? "max-w-[160px]" : "max-w-[200px]"
      )}
    >
      <span className="shrink-0 font-medium text-muted-foreground text-xs">
        [{citation.index}]
      </span>
      {app && (
        <span className="shrink-0">
          <AppLogo app={app} size={12} />
        </span>
      )}
      <span className="truncate text-foreground/80 text-xs">
        {displayTitle}
      </span>
    </div>
  );

  if (onPreview) {
    return (
      <button
        className="inline-block cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1"
        onClick={() => onPreview(citation)}
        title={citation.title}
        type="button"
      >
        {content}
      </button>
    );
  }

  if (citation.url) {
    return (
      <a
        className="inline-block focus:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1"
        href={citation.url}
        rel="noopener noreferrer"
        target="_blank"
        title={citation.title}
      >
        {content}
      </a>
    );
  }

  return (
    <div className="inline-block" title={citation.title}>
      {content}
    </div>
  );
}

function OverviewCitationsInner({
  citations,
  className,
  compact = false,
  onPreviewCitation,
}: OverviewCitationsProps) {
  if (citations.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {citations.map((citation) => (
        <CitationPill
          citation={citation}
          compact={compact}
          key={citation.documentId}
          onPreview={onPreviewCitation}
        />
      ))}
    </div>
  );
}

export const OverviewCitations = memo(OverviewCitationsInner);
OverviewCitations.displayName = "OverviewCitations";
