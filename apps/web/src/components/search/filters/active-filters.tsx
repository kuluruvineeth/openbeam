"use client";

import { appStore } from "@openplane/integrations";
import { AppLogo } from "@/components/integrations/app-logo";
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
import { FilterChip } from "./filter-chip";

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
  dateRange,
  onDateRangeChange,
  ranking,
  onRankingChange,
}: ActiveFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {connectorTypes.map((type) => {
        const app = appStore.find((a) => a.id.toLowerCase() === type);
        return (
          <FilterChip
            key={type}
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
        );
      })}
      {documentTypes.map((type) => (
        <FilterChip
          key={type}
          label={DOCUMENT_TYPE_CONFIG[type as DocumentType]?.label || type}
          onRemove={() =>
            onDocumentTypesChange(documentTypes.filter((t) => t !== type))
          }
        />
      ))}
      {sourceTypes.map((type) => (
        <FilterChip
          key={type}
          label={SOURCE_TYPE_CONFIG[type as SourceType] || type}
          onRemove={() =>
            onSourceTypesChange(sourceTypes.filter((t) => t !== type))
          }
        />
      ))}
      {statuses.map((status) => (
        <FilterChip
          key={status}
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
      ))}
      {priorities.map((priority) => (
        <FilterChip
          key={priority}
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
      ))}
      {dateRange && (
        <FilterChip
          label={DATE_RANGE_CONFIG[dateRange]}
          onRemove={() => onDateRangeChange(null)}
        />
      )}
      {ranking !== "hybrid" && (
        <FilterChip
          label={`Sort: ${RANKING_CONFIG[ranking].label}`}
          onRemove={() => onRankingChange("hybrid")}
        />
      )}
    </div>
  );
}
