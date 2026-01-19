"use client";

import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "../../utils/cn";

type FilterChipType = "status" | "date" | "tag" | "search" | "type" | "custom";

interface FilterChip {
  id: string;
  type: FilterChipType;
  label: string;
  value: unknown;
}

interface FilterChipsProps {
  filters: FilterChip[];
  onRemove: (id: string) => void;
  onClearAll: () => void;
  className?: string;
}

function FilterChips({
  filters,
  onRemove,
  onClearAll,
  className,
}: FilterChipsProps) {
  if (filters.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <AnimatePresence mode="popLayout">
        {filters.map((filter) => (
          <motion.div
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs",
              "border border-border/50 bg-secondary text-secondary-foreground"
            )}
            exit={{ opacity: 0, scale: 0.8 }}
            initial={{ opacity: 0, scale: 0.8 }}
            key={filter.id}
            layout
          >
            <span className="text-muted-foreground capitalize">
              {filter.type}:
            </span>
            <span className="font-medium">{filter.label}</span>
            <button
              className="ml-0.5 rounded p-0.5 hover:bg-muted-foreground/20"
              onClick={() => onRemove(filter.id)}
              type="button"
            >
              <X className="h-3 w-3" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      {filters.length > 1 && (
        <button
          className="text-muted-foreground text-xs transition-colors hover:text-foreground"
          onClick={onClearAll}
          type="button"
        >
          Clear all
        </button>
      )}
    </div>
  );
}

export { FilterChips };
export type { FilterChip, FilterChipsProps, FilterChipType };
