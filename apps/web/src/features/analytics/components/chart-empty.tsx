"use client";

import { cn, Icons } from "@openplane/ui";
import { cva, type VariantProps } from "class-variance-authority";
import { COMPACT_CHART_HEIGHT, DEFAULT_CHART_HEIGHT } from "../constants";

const emptyVariants = cva(
  "flex flex-col items-center justify-center rounded-md border border-dashed text-muted-foreground",
  {
    variants: {
      state: {
        empty: "border-border/50",
        error: "border-destructive/50",
        loading: "border-border/50",
      },
    },
    defaultVariants: {
      state: "empty",
    },
  }
);

type ChartEmptyProps = VariantProps<typeof emptyVariants> & {
  size?: "default" | "compact";
  message?: string;
  className?: string;
};

export function ChartEmpty({
  size = "default",
  state,
  message,
  className,
}: ChartEmptyProps) {
  const height =
    size === "compact" ? COMPACT_CHART_HEIGHT : DEFAULT_CHART_HEIGHT;

  return (
    <div className={cn(emptyVariants({ state }), className)} style={{ height }}>
      {state === "error" && (
        <>
          <Icons.AlertCircle className="mb-2 text-destructive" size={20} />
          <span className="text-destructive text-xs">
            {message ?? "Failed to load chart"}
          </span>
        </>
      )}
      {state === "loading" && (
        <Icons.Spinner className="animate-spin" size={20} />
      )}
      {state === "empty" && (
        <>
          <Icons.BarChart className="mb-2" size={20} />
          <span className="text-xs">{message ?? "No data"}</span>
        </>
      )}
    </div>
  );
}
