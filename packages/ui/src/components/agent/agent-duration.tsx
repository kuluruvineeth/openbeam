"use client";

import { forwardRef, useCallback, useEffect, useState } from "react";
import { AGENT_UI_CONSTANTS } from "../../lib/agent-constants";
import { cn } from "../../utils/cn";
import { formatDurationPrecise } from "../../utils/format";

type AgentDurationProps = React.ComponentProps<"time"> & {
  startTime?: number;
  endTime?: number;
  isActive?: boolean;
  updateInterval?: number;
};

const AgentDuration = forwardRef<HTMLTimeElement, AgentDurationProps>(
  (
    {
      className,
      startTime,
      endTime,
      isActive = false,
      updateInterval = AGENT_UI_CONSTANTS.DURATION_UPDATE_INTERVAL,
      ...props
    },
    ref
  ) => {
    const calculateDuration = useCallback(() => {
      if (!startTime) {
        return 0;
      }
      const end = endTime ?? performance.now();
      return end - startTime;
    }, [startTime, endTime]);

    const [duration, setDuration] = useState(calculateDuration);

    useEffect(() => {
      if (!isActive || endTime) {
        setDuration(calculateDuration());
        return;
      }

      const interval = setInterval(() => {
        setDuration(calculateDuration());
      }, updateInterval);

      return () => clearInterval(interval);
    }, [isActive, endTime, calculateDuration, updateInterval]);

    if (!startTime) {
      return null;
    }

    return (
      <time
        className={cn("text-muted-foreground text-xs tabular-nums", className)}
        dateTime={`PT${Math.round(duration / 1000)}S`}
        ref={ref}
        {...props}
      >
        {formatDurationPrecise(duration)}
      </time>
    );
  }
);
AgentDuration.displayName = "AgentDuration";

export { AgentDuration, formatDurationPrecise };
export type { AgentDurationProps };
