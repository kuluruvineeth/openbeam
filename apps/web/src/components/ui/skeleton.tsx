import * as React from "react";
import { cn } from "@/lib/utils";

type SkeletonProps = React.ComponentProps<"div"> & {
  animate?: boolean;
};

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, animate = true, ...props }, ref) => (
    <div
      className={cn("rounded-md bg-accent", animate && "shimmer", className)}
      data-slot="skeleton"
      ref={ref}
      {...props}
    />
  )
);
Skeleton.displayName = "Skeleton";

export { Skeleton };
