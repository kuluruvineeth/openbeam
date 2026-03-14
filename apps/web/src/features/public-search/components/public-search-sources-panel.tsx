"use client";

import { Button, ScrollArea, Skeleton } from "@openbeam/ui";
import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils";
import type { PublicSearchFacets } from "../lib/api";
import { SOURCE_COLORS, SOURCE_LABELS, SOURCE_TABS } from "../lib/constants";

type Props = {
  activeDataset: string | null;
  onDatasetChange: (dataset: string | null) => void;
  facets?: PublicSearchFacets;
  isLoading?: boolean;
};

function SourceItem({
  label,
  dataset,
  count,
  isSelected,
  onToggle,
}: {
  label: string;
  dataset: string;
  count: number;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const colors = SOURCE_COLORS[dataset];
  return (
    <Button
      className={cn(
        "h-9 w-full justify-start gap-2.5 px-3 font-normal text-xs",
        isSelected && "bg-foreground/5"
      )}
      onClick={onToggle}
      variant="ghost"
    >
      <div className="flex size-5 shrink-0 items-center justify-center">
        <div
          className={cn(
            "size-2.5 rounded-sm",
            colors?.bg ?? "bg-foreground/20"
          )}
        />
      </div>
      <span className="flex-1 truncate text-left">{label}</span>
      <span className="shrink-0 font-mono text-[10px] text-foreground/40 tabular-nums">
        {count.toLocaleString()}
      </span>
      {isSelected && (
        <Icons.CheckIcon className="shrink-0 text-foreground/60" size={12} />
      )}
    </Button>
  );
}

function SourcesSkeleton() {
  return (
    <div className="space-y-1 px-2">
      {Array.from({ length: 4 }, (_, i) => (
        <div
          className="flex h-9 items-center gap-2.5 px-3"
          key={`source-skel-${i}`}
        >
          <Skeleton className="size-5 rounded" />
          <Skeleton className="h-3 flex-1" />
          <Skeleton className="h-3 w-8" />
        </div>
      ))}
    </div>
  );
}

export function PublicSearchSourcesPanel({
  activeDataset,
  onDatasetChange,
  facets,
  isLoading = false,
}: Props) {
  const hasSelection = activeDataset !== null;

  const sources = SOURCE_TABS.filter(
    (t): t is typeof t & { dataset: string } => t.dataset !== undefined
  ).map((tab) => ({
    dataset: tab.dataset,
    label: SOURCE_LABELS[tab.dataset] ?? tab.label,
    count: facets?.datasets.find((f) => f.dataset === tab.dataset)?.count ?? 0,
  }));

  return (
    <aside className="flex h-full w-56 flex-col bg-background">
      <header className="flex shrink-0 items-center justify-between px-4 py-3">
        <h3 className="font-medium text-foreground/60 text-xs uppercase tracking-wide">
          Datasets
        </h3>
        {hasSelection && (
          <Button
            className="h-6 px-2 text-[10px]"
            onClick={() => onDatasetChange(null)}
            size="sm"
            variant="ghost"
          >
            Clear
          </Button>
        )}
      </header>

      <ScrollArea className="flex-1">
        <nav className="py-2">
          {isLoading && <SourcesSkeleton />}
          {!isLoading && (
            <div className="space-y-0.5 px-2">
              {sources.map((source) => (
                <SourceItem
                  count={source.count}
                  dataset={source.dataset}
                  isSelected={activeDataset === source.dataset}
                  key={source.dataset}
                  label={source.label}
                  onToggle={() =>
                    onDatasetChange(
                      activeDataset === source.dataset ? null : source.dataset
                    )
                  }
                />
              ))}
            </div>
          )}
        </nav>
      </ScrollArea>
    </aside>
  );
}
