"use client";

import { Icons } from "@/components/icons";
import { ActiveFilters } from "@/components/search/filters/active-filters";
import { AppFilter } from "@/components/search/filters/app-filter";
import { AuthorFilter } from "@/components/search/filters/author-filter";
import { DateRangeFilter } from "@/components/search/filters/date-range-filter";
import { MultiSelectFilter } from "@/components/search/filters/multi-select-filter";
import { RankingFilter } from "@/components/search/filters/ranking-filter";
import { Button } from "@/components/ui/button";
import {
  DOCUMENT_TYPE_OPTIONS,
  PRIORITY_OPTIONS,
  SOURCE_TYPE_OPTIONS,
  STATUS_OPTIONS,
} from "@/hooks/use-search";
import {
  type DateRangeType,
  DOCUMENT_TYPE_CONFIG,
  PRIORITY_CONFIG,
  type SearchRanking,
  SOURCE_TYPE_CONFIG,
  STATUS_CONFIG,
} from "@/lib/search-config";
import { cn } from "@/lib/utils";

type SearchFiltersProps = {
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
  onClearAll: () => void;
  activeFilterCount: number;
};

export function SearchFilters({
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
  onClearAll,
  activeFilterCount,
}: SearchFiltersProps) {
  return (
    <fieldset className="space-y-2 border-none p-0">
      <legend className="sr-only">Search filters</legend>
      <div className="flex flex-wrap items-center gap-2">
        <AppFilter
          onChange={onConnectorTypesChange}
          selected={connectorTypes}
        />

        <AuthorFilter onChange={onAuthorsChange} selected={authors} />

        <MultiSelectFilter
          icon="FileTextIcon"
          label="Type"
          onChange={onDocumentTypesChange}
          options={DOCUMENT_TYPE_OPTIONS}
          renderOption={(option) => {
            const config = DOCUMENT_TYPE_CONFIG[option];
            const Icon = config ? Icons[config.icon] : Icons.FileIcon;
            return (
              <>
                <Icon className="text-foreground/50" size={14} />
                <span className="flex-1">{config?.label || option}</span>
              </>
            );
          }}
          selected={documentTypes}
        />

        <MultiSelectFilter
          icon="Hash"
          label="Source"
          onChange={onSourceTypesChange}
          options={SOURCE_TYPE_OPTIONS}
          renderOption={(option) => (
            <span className="flex-1">
              {SOURCE_TYPE_CONFIG[option] || option}
            </span>
          )}
          selected={sourceTypes}
        />

        <MultiSelectFilter
          icon="AlertCircle"
          label="Status"
          onChange={onStatusesChange}
          options={STATUS_OPTIONS}
          renderOption={(option) => {
            const config = STATUS_CONFIG[option];
            return (
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px]",
                  config?.color || "bg-foreground/5"
                )}
              >
                {config?.label || option}
              </span>
            );
          }}
          selected={statuses}
        />

        <MultiSelectFilter
          icon="ArrowRight"
          label="Priority"
          onChange={onPrioritiesChange}
          options={PRIORITY_OPTIONS}
          renderOption={(option) => {
            const config = PRIORITY_CONFIG[option];
            return (
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px]",
                  config?.color || "bg-foreground/5"
                )}
              >
                {config?.label || option}
              </span>
            );
          }}
          selected={priorities}
        />

        <DateRangeFilter onChange={onDateRangeChange} value={dateRange} />

        <span aria-hidden="true" className="h-4 w-px bg-border/50" />

        <RankingFilter onChange={onRankingChange} value={ranking} />

        {activeFilterCount > 0 && (
          <>
            <span aria-hidden="true" className="h-4 w-px bg-border/50" />
            <Button
              className="h-8 gap-1 px-2 text-foreground/50 text-xs hover:text-foreground"
              onClick={onClearAll}
              size="sm"
              variant="ghost"
            >
              <Icons.Close size={12} />
              Clear all ({activeFilterCount})
            </Button>
          </>
        )}
      </div>

      {activeFilterCount > 0 && (
        <ActiveFilters
          authors={authors}
          connectorTypes={connectorTypes}
          dateRange={dateRange}
          documentTypes={documentTypes}
          onAuthorsChange={onAuthorsChange}
          onConnectorTypesChange={onConnectorTypesChange}
          onDateRangeChange={onDateRangeChange}
          onDocumentTypesChange={onDocumentTypesChange}
          onPrioritiesChange={onPrioritiesChange}
          onRankingChange={onRankingChange}
          onSourceTypesChange={onSourceTypesChange}
          onStatusesChange={onStatusesChange}
          priorities={priorities}
          ranking={ranking}
          sourceTypes={sourceTypes}
          statuses={statuses}
        />
      )}
    </fieldset>
  );
}
