"use client";

import { useCallback, useEffect, useState } from "react";
import { useDocumentPreview } from "@/features/file-preview";
import { useSearch } from "../hooks/use-search";
import type { AutocompleteSuggestion } from "../types";
import { SearchCommand } from "./search-command";
import { SearchExpanded } from "./search-expanded";

export function SearchPage() {
  const { setQuery, hasQuery } = useSearch();
  const { openPreview, closePreview, hasPreview } = useDocumentPreview();
  const [hasSearched, setHasSearched] = useState(false);

  const showExpandedMode = hasQuery || hasSearched;

  useEffect(() => {
    if (!showExpandedMode && hasPreview) {
      closePreview();
    }
  }, [showExpandedMode, hasPreview, closePreview]);

  const handleSubmit = useCallback(
    (q: string) => {
      setQuery(q);
      setHasSearched(true);
    },
    [setQuery]
  );

  const handleSelectSuggestion = useCallback(
    (suggestion: AutocompleteSuggestion) => {
      if (suggestion.type === "document") {
        setQuery(suggestion.label);
        setHasSearched(true);
        openPreview(suggestion.id, "document");
      } else {
        setQuery(suggestion.label);
        setHasSearched(true);
      }
    },
    [setQuery, openPreview]
  );

  return (
    <div className="mt-4 h-[calc(100vh-6rem)]">
      {showExpandedMode ? (
        <SearchExpanded />
      ) : (
        <SearchCommand
          onSelectSuggestion={handleSelectSuggestion}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
