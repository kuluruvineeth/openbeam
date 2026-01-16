"use client";

import { forwardRef, useEffect, useState } from "react";
import { AGENT_UI_CONSTANTS } from "../../lib/agent-constants";
import { cn } from "../../utils/cn";

type StreamingCursorProps = React.ComponentProps<"span"> & {
  isActive?: boolean;
  blinkInterval?: number;
};

const StreamingCursor = forwardRef<HTMLSpanElement, StreamingCursorProps>(
  (
    {
      className,
      isActive = true,
      blinkInterval = AGENT_UI_CONSTANTS.CURSOR_BLINK_MS,
      ...props
    },
    ref
  ) => {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
      if (!isActive) {
        setVisible(false);
        return;
      }

      setVisible(true);
      const interval = setInterval(() => {
        setVisible((v) => !v);
      }, blinkInterval);

      return () => clearInterval(interval);
    }, [isActive, blinkInterval]);

    if (!isActive) {
      return null;
    }

    return (
      <span
        aria-hidden="true"
        className={cn(
          "inline-block h-[1.1em] w-[2px] translate-y-[1px] bg-foreground",
          visible ? "opacity-100" : "opacity-0",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
StreamingCursor.displayName = "StreamingCursor";

export { StreamingCursor };
export type { StreamingCursorProps };
