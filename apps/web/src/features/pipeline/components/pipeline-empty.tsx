"use client";

import { cn, Icons } from "@openbeam/ui";
import { cva, type VariantProps } from "class-variance-authority";

const emptyVariants = cva(
  "flex items-center justify-center rounded-md border border-dashed text-xs transition-colors",
  {
    variants: {
      state: {
        idle: "border-border/50 text-muted-foreground",
        active: "border-primary/50 text-primary",
      },
      size: {
        default: "py-8",
        compact: "py-4",
      },
    },
    defaultVariants: {
      state: "idle",
      size: "default",
    },
  }
);

type PipelineEmptyProps = VariantProps<typeof emptyVariants> & {
  className?: string;
};

export function PipelineEmpty({ state, size, className }: PipelineEmptyProps) {
  return (
    <div className={cn(emptyVariants({ state, size }), className)}>
      {state === "active" ? (
        <span className="flex items-center gap-1.5">
          <Icons.Plus size={12} />
          Drop here
        </span>
      ) : (
        "No items"
      )}
    </div>
  );
}
