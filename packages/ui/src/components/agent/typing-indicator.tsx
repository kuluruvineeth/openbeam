"use client";

import { forwardRef } from "react";
import { cn } from "../../utils/cn";

type TypingIndicatorProps = React.ComponentProps<"div">;

const TypingIndicator = forwardRef<HTMLDivElement, TypingIndicatorProps>(
  ({ className, ...props }, ref) => (
    <div
      className={cn("inline-flex items-center gap-1", className)}
      ref={ref}
      {...props}
    >
      <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:0ms]" />
      <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:150ms]" />
      <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:300ms]" />
    </div>
  )
);
TypingIndicator.displayName = "TypingIndicator";

export { TypingIndicator };
export type { TypingIndicatorProps };
