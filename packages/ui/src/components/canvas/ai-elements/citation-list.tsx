"use client";

import type { Citation } from "@openbeam/types/canvas";
import { memo } from "react";
import { CitationCard } from "./citation-card";
import { CitationChip } from "./citation-chip";

type CitationDisplayStyle = "inline" | "cards" | "compact";

interface CitationListProps {
  citations: Citation[];
  style?: CitationDisplayStyle;
  onCitationClick?: (citation: Citation) => void;
}

export const CitationList = memo(function CitationListComponent({
  citations,
  style = "inline",
  onCitationClick,
}: CitationListProps) {
  if (citations.length === 0) {
    return null;
  }

  if (style === "inline" || style === "compact") {
    return (
      <div className="flex flex-wrap gap-1">
        {citations.map((citation, i) => (
          <CitationChip
            citation={citation}
            index={i + 1}
            key={citation.documentId}
            onClick={() => onCitationClick?.(citation)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {citations.map((citation, i) => (
        <CitationCard
          citation={citation}
          index={i + 1}
          key={citation.documentId}
          onClick={() => onCitationClick?.(citation)}
        />
      ))}
    </div>
  );
});

CitationList.displayName = "CitationList";

export type { CitationDisplayStyle, CitationListProps };
