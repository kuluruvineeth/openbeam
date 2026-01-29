"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, memo, useCallback, useEffect, useState } from "react";
import { cn } from "../../../utils";
import { Button } from "../../button";
import { Icons } from "../../icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../tooltip";

const nodeToolbarVariants = cva(
  "flex items-center gap-1 rounded-md border bg-background/80 p-1 backdrop-blur-sm",
  {
    variants: {
      position: {
        inline: "",
        floating: "-translate-x-1/2 absolute bottom-2 left-1/2 z-10 shadow-sm",
      },
    },
    defaultVariants: {
      position: "inline",
    },
  }
);

type ToolbarAction = "generate" | "stop" | "copy" | "regenerate" | "download";

export interface NodeToolbarProps
  extends VariantProps<typeof nodeToolbarVariants> {
  isRunning?: boolean;
  hasContent?: boolean;
  onGenerate?: () => void;
  onRun?: () => void;
  onStop?: () => void;
  onCopy?: () => void;
  onRegenerate?: () => void;
  onDownload?: () => void;
  enabledActions?: ToolbarAction[];
  className?: string;
}

export const NodeToolbar = memo(
  forwardRef<HTMLDivElement, NodeToolbarProps>(function NodeToolbarComponent(
    {
      isRunning = false,
      hasContent = false,
      onGenerate,
      onRun,
      onStop,
      onCopy,
      onRegenerate,
      onDownload,
      enabledActions = ["generate", "stop", "copy", "regenerate"],
      position,
      className,
    },
    ref
  ) {
    const handleGenerate = onGenerate ?? onRun;
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

    const showGenerate =
      enabledActions.includes("generate") && !isRunning && handleGenerate;
    const showStop = enabledActions.includes("stop") && isRunning;
    const showCopy =
      enabledActions.includes("copy") && hasContent && !isRunning;
    const showRegenerate =
      enabledActions.includes("regenerate") && hasContent && !isRunning;
    const showDownload =
      enabledActions.includes("download") && hasContent && !isRunning;

    return (
      <div
        className={cn(nodeToolbarVariants({ position }), className)}
        ref={ref}
      >
        {showGenerate && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="size-7"
                onClick={handleGenerate}
                size="icon"
                variant="ghost"
              >
                <Icons.Play size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Generate</TooltipContent>
          </Tooltip>
        )}

        {showStop && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="size-7"
                onClick={onStop}
                size="icon"
                variant="ghost"
              >
                <Icons.SquareIcon size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Stop</TooltipContent>
          </Tooltip>
        )}

        {isRunning && (
          <div className="flex items-center px-1">
            <Icons.Loader2
              className="animate-spin text-muted-foreground"
              size={14}
            />
          </div>
        )}

        {showCopy && (
          <Tooltip>
            <TooltipTrigger asChild>
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
            </TooltipTrigger>
            <TooltipContent side="top">
              {copied ? "Copied!" : "Copy"}
            </TooltipContent>
          </Tooltip>
        )}

        {showRegenerate && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="size-7"
                onClick={onRegenerate}
                size="icon"
                variant="ghost"
              >
                <Icons.RefreshCw size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Regenerate</TooltipContent>
          </Tooltip>
        )}

        {showDownload && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="size-7"
                onClick={onDownload}
                size="icon"
                variant="ghost"
              >
                <Icons.Download size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Download</TooltipContent>
          </Tooltip>
        )}
      </div>
    );
  })
);

NodeToolbar.displayName = "NodeToolbar";
