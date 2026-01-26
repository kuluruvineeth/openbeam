"use client";

import { memo, useCallback } from "react";
import { cn } from "../../../utils";
import { Checkbox } from "../../checkbox";

interface ConnectorSource {
  id: string;
  name: string;
}

interface SourceFilterGridProps {
  availableSources: ConnectorSource[];
  selectedSources: string[];
  onChange: (sources: string[]) => void;
}

export const SourceFilterGrid = memo(function SourceFilterGridComponent({
  availableSources,
  selectedSources,
  onChange,
}: SourceFilterGridProps) {
  const allSelected = selectedSources.length === 0;

  const toggleSource = useCallback(
    (sourceId: string) => {
      if (selectedSources.includes(sourceId)) {
        onChange(selectedSources.filter((s) => s !== sourceId));
      } else {
        onChange([...selectedSources, sourceId]);
      }
    },
    [selectedSources, onChange]
  );

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {availableSources.map((source) => {
          const isChecked = selectedSources.includes(source.id);
          const checkboxId = `source-filter-${source.id}`;
          return (
            <label
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 transition-colors",
                isChecked
                  ? "border-primary bg-primary/5"
                  : "border-border/50 hover:border-border hover:bg-muted/50"
              )}
              htmlFor={checkboxId}
              key={source.id}
            >
              <Checkbox
                checked={isChecked}
                id={checkboxId}
                onCheckedChange={() => toggleSource(source.id)}
              />
              <span className="text-sm">{source.name}</span>
            </label>
          );
        })}
      </div>
      {allSelected && (
        <p className="text-muted-foreground text-xs">
          Searching all {availableSources.length} connected sources
        </p>
      )}
    </div>
  );
});

SourceFilterGrid.displayName = "SourceFilterGrid";

export type { ConnectorSource, SourceFilterGridProps };
