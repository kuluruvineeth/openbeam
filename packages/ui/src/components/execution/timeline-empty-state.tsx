"use client";

import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import { Icons } from "../icons";

type TimelineEmptyStateProps = React.ComponentProps<"div"> & {
  hasFilter?: boolean;
};

const TimelineEmptyState = forwardRef<HTMLDivElement, TimelineEmptyStateProps>(
  ({ hasFilter = false, className, ...props }, ref) => (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 text-center",
        className
      )}
      ref={ref}
      {...props}
    >
      {hasFilter ? (
        <Icons.FilterX className="size-6 text-muted-foreground/50" />
      ) : (
        <Icons.ListTree className="size-6 text-muted-foreground/50" />
      )}
      <p className="mt-3 font-medium text-sm">
        {hasFilter ? "No matching steps" : "No steps yet"}
      </p>
      <p className="mt-1 max-w-[200px] text-muted-foreground text-xs">
        {hasFilter
          ? "Try adjusting your filters."
          : "Steps will appear here as the execution progresses."}
      </p>
    </div>
  )
);
TimelineEmptyState.displayName = "TimelineEmptyState";

export { TimelineEmptyState };
export type { TimelineEmptyStateProps };
