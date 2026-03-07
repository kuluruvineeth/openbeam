"use client";

import { Button, Separator } from "@openbeam/ui";
import { Icons } from "@/components/icons";
import { DOCUMENT_TYPE_OPTIONS } from "../hooks/use-search";
import { type DateRangeType, DOCUMENT_TYPE_CONFIG } from "../lib/config";
import { ActiveFilters } from "../ui/filters/active-filters";
import { AuthorFilter } from "../ui/filters/author-filter";
import { DateRangeFilter } from "../ui/filters/date-range-filter";
import { MultiSelectFilter } from "../ui/filters/multi-select-filter";

type SearchFiltersProps = {
  documentTypes: string[];
  onDocumentTypesChange: (value: string[] | null) => void;
  authors: string[];
  onAuthorsChange: (value: string[] | null) => void;
  dateRange: DateRangeType | null;
  onDateRangeChange: (value: DateRangeType | null) => void;
  onClearAll: () => void;
  activeFilterCount: number;
};

export function SearchFilters({
  documentTypes,
  onDocumentTypesChange,
  authors,
  onAuthorsChange,
  dateRange,
  onDateRangeChange,
  onClearAll,
  activeFilterCount,
}: SearchFiltersProps) {
  return (
    <fieldset className="border-none p-0">
      <legend className="sr-only">Search filters</legend>
      <div className="flex flex-wrap items-center gap-2">
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

        <DateRangeFilter onChange={onDateRangeChange} value={dateRange} />

        {activeFilterCount > 0 && (
          <>
            <Separator className="h-4 bg-border/50" orientation="vertical" />
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
          dateRange={dateRange}
          documentTypes={documentTypes}
          onAuthorsChange={onAuthorsChange}
          onDateRangeChange={onDateRangeChange}
          onDocumentTypesChange={onDocumentTypesChange}
        />
      )}
    </fieldset>
  );
}
