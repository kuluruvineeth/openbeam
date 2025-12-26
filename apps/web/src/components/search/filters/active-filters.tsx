"use client";

import { appStore } from "@openplane/integrations";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Icons } from "@/components/icons";
import { AppLogo } from "@/components/integrations/app-logo";
import { FilterChip } from "@/components/search/filters/filter-chip";
import {
  DATE_RANGE_CONFIG,
  type DateRangeType,
  DOCUMENT_TYPE_CONFIG,
  type DocumentType,
  PRIORITY_CONFIG,
  type PriorityType,
  RANKING_CONFIG,
  type SearchRanking,
  SOURCE_TYPE_CONFIG,
  type SourceType,
  STATUS_CONFIG,
  type StatusType,
} from "@/lib/search-config";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

type ActiveFiltersProps = {
  connectorTypes: string[];
  onConnectorTypesChange: (value: string[] | null) => void;
  documentTypes: string[];
  onDocumentTypesChange: (value: string[] | null) => void;
  sourceTypes: string[];
  onSourceTypesChange: (value: string[] | null) => void;
  statuses: string[];
  onStatusesChange: (value: string[] | null) => void;
  priorities: string[];
  onPrioritiesChange: (value: string[] | null) => void;
  authors: string[];
  onAuthorsChange: (value: string[] | null) => void;
  dateRange: DateRangeType | null;
  onDateRangeChange: (value: DateRangeType | null) => void;
  ranking: SearchRanking;
  onRankingChange: (value: SearchRanking) => void;
};

export function ActiveFilters({
  connectorTypes,
  onConnectorTypesChange,
  documentTypes,
  onDocumentTypesChange,
  sourceTypes,
  onSourceTypesChange,
  statuses,
  onStatusesChange,
  priorities,
  onPrioritiesChange,
  authors,
  onAuthorsChange,
  dateRange,
  onDateRangeChange,
  ranking,
  onRankingChange,
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
      className="flex list-none flex-wrap items-center gap-1.5"
    >
      {connectorTypes.map((type) => {
        const app = appStore.find((a) => a.id.toLowerCase() === type);
        return (
          <li key={type}>
            <FilterChip
              label={
                <span className="flex items-center gap-1">
                  {app && <AppLogo app={app} size={12} />}
                  {app?.name || type}
                </span>
              }
              onRemove={() =>
                onConnectorTypesChange(connectorTypes.filter((t) => t !== type))
              }
            />
          </li>
        );
      })}
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
      {sourceTypes.map((type) => (
        <li key={type}>
          <FilterChip
            label={SOURCE_TYPE_CONFIG[type as SourceType] || type}
            onRemove={() =>
              onSourceTypesChange(sourceTypes.filter((t) => t !== type))
            }
          />
        </li>
      ))}
      {statuses.map((status) => (
        <li key={status}>
          <FilterChip
            label={
              <span
                className={cn(
                  "rounded px-1 py-0.5 text-[10px]",
                  STATUS_CONFIG[status as StatusType]?.color
                )}
              >
                {STATUS_CONFIG[status as StatusType]?.label || status}
              </span>
            }
            onRemove={() =>
              onStatusesChange(statuses.filter((s) => s !== status))
            }
          />
        </li>
      ))}
      {priorities.map((priority) => (
        <li key={priority}>
          <FilterChip
            label={
              <span
                className={cn(
                  "rounded px-1 py-0.5 text-[10px]",
                  PRIORITY_CONFIG[priority as PriorityType]?.color
                )}
              >
                {PRIORITY_CONFIG[priority as PriorityType]?.label || priority}
              </span>
            }
            onRemove={() =>
              onPrioritiesChange(priorities.filter((p) => p !== priority))
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
      {ranking !== "hybrid" && (
        <li>
          <FilterChip
            label={`Sort: ${RANKING_CONFIG[ranking].label}`}
            onRemove={() => onRankingChange("hybrid")}
          />
        </li>
      )}
    </ul>
  );
}
