"use client";

import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import { StreamingCursor } from "./streaming-cursor";

type StreamingTextProps = React.ComponentProps<"span"> & {
  isStreaming?: boolean;
  showCursor?: boolean;
};

const StreamingText = forwardRef<HTMLSpanElement, StreamingTextProps>(
  (
    { className, children, isStreaming = false, showCursor = true, ...props },
    ref
  ) => (
    <span className={cn("inline", className)} ref={ref} {...props}>
      {children}
      {showCursor && <StreamingCursor isActive={isStreaming} />}
    </span>
  )
);
StreamingText.displayName = "StreamingText";

export { StreamingText };
export type { StreamingTextProps };
