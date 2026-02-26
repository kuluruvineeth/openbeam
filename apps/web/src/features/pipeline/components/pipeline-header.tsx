"use client";

import { cn, Icons } from "@openplane/ui";
import { cva } from "class-variance-authority";
import { usePipelineStore } from "../stores/pipeline-store";
import type { PipelineViewMode } from "../types";

const viewToggleVariants = cva(
  "flex items-center justify-center rounded-sm p-1.5 transition-colors",
  {
    variants: {
      active: {
        true: "bg-primary/10 text-primary",
        false: "text-muted-foreground hover:text-foreground",
      },
    },
    defaultVariants: {
      active: false,
    },
  }
);

type PipelineHeaderProps = {
  title: string;
  totalCount: number;
  filteredCount: number;
  className?: string;
};

export function PipelineHeader({
  title,
  totalCount,
  filteredCount,
  className,
}: PipelineHeaderProps) {
  const viewMode = usePipelineStore((s) => s.viewMode);
  const setViewMode = usePipelineStore((s) => s.setViewMode);

  const isFiltered = filteredCount !== totalCount;

  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div className="flex items-center gap-3">
        <h2 className="font-semibold text-lg">{title}</h2>
        <span className="text-muted-foreground text-sm">
          {isFiltered ? `${filteredCount} of ${totalCount}` : totalCount}
        </span>
      </div>

      <div className="flex items-center gap-1 rounded-md border border-border/50 p-0.5">
        <ViewToggleButton
          currentMode={viewMode}
          mode="kanban"
          onSelect={setViewMode}
        />
        <ViewToggleButton
          currentMode={viewMode}
          mode="table"
          onSelect={setViewMode}
        />
      </div>
    </div>
  );
}

function ViewToggleButton({
  mode,
  currentMode,
  onSelect,
}: {
  mode: PipelineViewMode;
  currentMode: PipelineViewMode;
  onSelect: (mode: PipelineViewMode) => void;
}) {
  const isActive = mode === currentMode;
  const Icon = mode === "kanban" ? Icons.Grid3x3 : Icons.List;

  return (
    <button
      aria-label={`Switch to ${mode} view`}
      className={cn(viewToggleVariants({ active: isActive }))}
      onClick={() => onSelect(mode)}
      type="button"
    >
      <Icon size={14} />
    </button>
  );
}
