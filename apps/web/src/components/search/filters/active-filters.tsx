"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Icons } from "@/components/icons";
import { FilterChip } from "@/components/search/filters/filter-chip";
import {
  DATE_RANGE_CONFIG,
  type DateRangeType,
  DOCUMENT_TYPE_CONFIG,
  type DocumentType,
} from "@/lib/search-config";
import { useTRPC } from "@/trpc/client";

type ActiveFiltersProps = {
  documentTypes: string[];
  onDocumentTypesChange: (value: string[] | null) => void;
  authors: string[];
  onAuthorsChange: (value: string[] | null) => void;
  dateRange: DateRangeType | null;
  onDateRangeChange: (value: DateRangeType | null) => void;
};

export function ActiveFilters({
  documentTypes,
  onDocumentTypesChange,
  authors,
  onAuthorsChange,
  dateRange,
  onDateRangeChange,
}: ActiveFiltersProps) {
  const trpc = useTRPC();

  const { data: authorsData } = useQuery({
    ...trpc.search.authors.queryOptions({ limit: 50 }),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    enabled: authors.length > 0,
  });

  const authorMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const author of authorsData?.authors ?? []) {
      map.set(
        author.authorId,
        author.authorName ?? author.authorEmail ?? author.authorId
      );
    }
    return map;
  }, [authorsData]);

  return (
    <ul
      aria-label="Active filters"
      className="mt-2 flex list-none flex-wrap items-center gap-1.5"
    >
      {documentTypes.map((type) => (
        <li key={type}>
          <FilterChip
            label={DOCUMENT_TYPE_CONFIG[type as DocumentType]?.label || type}
            onRemove={() =>
              onDocumentTypesChange(documentTypes.filter((t) => t !== type))
            }
          />
        </li>
      ))}
      {authors.map((authorId) => (
        <li key={authorId}>
          <FilterChip
            label={
              <span className="flex items-center gap-1">
                <Icons.User size={10} />
                {authorMap.get(authorId) ?? authorId}
              </span>
            }
            onRemove={() =>
              onAuthorsChange(authors.filter((a) => a !== authorId))
            }
          />
        </li>
      ))}
      {dateRange && (
        <li>
          <FilterChip
            label={DATE_RANGE_CONFIG[dateRange]}
            onRemove={() => onDateRangeChange(null)}
          />
        </li>
      )}
    </ul>
  );
}
