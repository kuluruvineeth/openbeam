"use client";

import { forwardRef, useCallback, useEffect, useState } from "react";
import { cn } from "../../utils/cn";
import { Button } from "../button";
import { Icons } from "../icons";

type AgentMessageActionsProps = React.ComponentProps<"div"> & {
  onCopy?: () => void;
  onRetry?: () => void;
};

const AgentMessageActions = forwardRef<
  HTMLDivElement,
  AgentMessageActionsProps
>(({ className, onCopy, onRetry, ...props }, ref) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    onCopy?.();
    setCopied(true);
  }, [onCopy]);

  useEffect(() => {
    if (copied) {
      const timeout = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timeout);
    }
  }, [copied]);

  return (
    <div
      className={cn(
        "flex items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover/message:opacity-100",
        className
      )}
      ref={ref}
      {...props}
    >
      <Button
        className="h-7 w-7 text-muted-foreground hover:text-foreground"
        onClick={handleCopy}
        size="icon"
        variant="ghost"
      >
        {copied ? (
          <Icons.Check className="size-3.5 text-emerald-500" />
        ) : (
          <Icons.Copy className="size-3.5" />
        )}
      </Button>
      {onRetry && (
        <Button
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={onRetry}
          size="icon"
          variant="ghost"
        >
          <Icons.RefreshCw className="size-3.5" />
        </Button>
      )}
    </div>
  );
});
AgentMessageActions.displayName = "AgentMessageActions";

export { AgentMessageActions };
export type { AgentMessageActionsProps };
