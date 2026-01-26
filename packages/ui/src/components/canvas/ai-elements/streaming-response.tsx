"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, memo, useCallback, useEffect, useState } from "react";
import { cn } from "../../../utils";
import { Button } from "../../button";
import { Icons } from "../../icons";
import { Markdown } from "../../markdown";
import { ScrollArea } from "../../scroll-area";
import { Skeleton } from "../../skeleton";

const streamingResponseVariants = cva(
  "relative overflow-hidden rounded-md border bg-muted/30",
  {
    variants: {
      size: {
        sm: "max-h-[120px]",
        md: "max-h-[200px]",
        lg: "max-h-[300px]",
        full: "h-full",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

export interface StreamingResponseProps
  extends VariantProps<typeof streamingResponseVariants> {
  content: string;
  isStreaming?: boolean;
  showCursor?: boolean;
  showCopy?: boolean;
  showTokens?: boolean;
  tokenCount?: number;
  className?: string;
  onCopy?: () => void;
  error?: string;
}

export const StreamingResponse = memo(
  forwardRef<HTMLDivElement, StreamingResponseProps>(
    function StreamingResponseComponent(
      {
        content,
        isStreaming = false,
        showCursor = true,
        showCopy = true,
        showTokens = false,
        tokenCount,
        size,
        className,
        onCopy,
        error,
      },
      ref
    ) {
      const [copied, setCopied] = useState(false);

      const handleCopy = useCallback(async () => {
        await navigator.clipboard.writeText(content);
        setCopied(true);
        onCopy?.();
      }, [content, onCopy]);

      useEffect(() => {
        if (copied) {
          const timeout = setTimeout(() => setCopied(false), 2000);
          return () => clearTimeout(timeout);
        }
      }, [copied]);

      if (!(content || isStreaming)) {
        return (
          <div
            className={cn(
              streamingResponseVariants({ size }),
              "flex items-center justify-center p-4",
              className
            )}
            ref={ref}
          >
            <span className="text-muted-foreground text-sm">
              No response yet
            </span>
          </div>
        );
      }

      if (error) {
        return (
          <div
            className={cn(
              streamingResponseVariants({ size }),
              "flex items-center p-3",
              className
            )}
            ref={ref}
          >
            <span className="text-destructive text-sm">{error}</span>
          </div>
        );
      }

      if (!content && isStreaming) {
        return (
          <div
            className={cn(
              streamingResponseVariants({ size }),
              "p-3",
              className
            )}
            ref={ref}
          >
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          </div>
        );
      }

      return (
        <div
          className={cn(
            streamingResponseVariants({ size }),
            "group",
            className
          )}
          ref={ref}
        >
          <ScrollArea className="h-full">
            <div className="p-3">
              <Markdown
                className="max-w-none"
                content={content}
                size="sm"
                variant="compact"
              />
              {isStreaming && showCursor && (
                <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-foreground/70" />
              )}
            </div>
          </ScrollArea>
          <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            {showTokens && tokenCount !== undefined && (
              <span className="rounded bg-muted/80 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground tabular-nums">
                {tokenCount.toLocaleString()} tokens
              </span>
            )}
            {showCopy && content && !isStreaming && (
              <Button
                className="size-7"
                onClick={handleCopy}
                size="icon"
                variant="ghost"
              >
                {copied ? (
                  <Icons.Check className="text-green-500" size={14} />
                ) : (
                  <Icons.Copy size={14} />
                )}
              </Button>
            )}
          </div>
        </div>
      );
    }
  )
);

StreamingResponse.displayName = "StreamingResponse";
