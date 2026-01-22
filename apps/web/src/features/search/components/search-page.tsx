"use client";

import { useCallback, useEffect, useState } from "react";
import { useDocumentPreview } from "@/features/file-preview";
import { useSearch } from "../hooks/use-search";
import type { UnifiedSearchItem } from "../types";
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

  const handleSelectItem = useCallback(
    (item: UnifiedSearchItem) => {
      const itemTitle = item.data.title || "";
      setQuery(itemTitle);
      setHasSearched(true);
      openPreview(item.data.id, item.type === "media" ? "media" : "document");
    },
    [setQuery, openPreview]
  );

  return (
    <div className="mt-4 h-[calc(100vh-6rem)]">
      {showExpandedMode ? (
        <SearchExpanded />
      ) : (
        <SearchCommand
          onSelectItem={handleSelectItem}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
