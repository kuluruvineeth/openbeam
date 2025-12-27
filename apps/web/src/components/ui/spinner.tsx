import * as React from "react";
import { cn } from "@/lib/utils";

type SpinnerProps = {
  size?: number;
  className?: string;
};

const Spinner = React.forwardRef<SVGSVGElement, SpinnerProps>(
  ({ size = 20, className }, ref) => (
    <svg
      aria-label="Loading"
      className={cn("animate-spin text-muted-foreground", className)}
      fill="none"
      height={size}
      ref={ref}
      role="img"
      viewBox="0 0 24 24"
      width={size}
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        fill="currentColor"
      />
    </svg>
  )
);
Spinner.displayName = "Spinner";

export { Spinner };
export type { SpinnerProps };
