"use client";

import { Icons } from "@openbeam/ui";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@openbeam/ui/components/tooltip";
import { cn } from "@openbeam/ui/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { useHotkeys } from "react-hotkeys-hook";

const tabVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md px-3 py-1.5 font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      active: {
        true: "bg-background text-foreground shadow-sm",
        false: "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
      },
    },
    defaultVariants: {
      active: false,
    },
  }
);

const tabContainerVariants = cva(
  "inline-flex items-center gap-1 rounded-lg bg-muted/50 p-1",
  {
    variants: {
      size: {
        sm: "text-xs",
        md: "text-sm",
        lg: "text-base",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

type AgentViewTab = "canvas" | "executions";

type AgenticViewTabsProps = React.ComponentProps<"div"> &
  VariantProps<typeof tabContainerVariants> & {
    activeTab: AgentViewTab;
    onTabChange: (tab: AgentViewTab) => void;
    hasLiveExecution?: boolean;
    executionCount?: number;
    disabled?: boolean;
  };

export function AgenticViewTabs({
  activeTab,
  onTabChange,
  hasLiveExecution = false,
  executionCount,
  disabled = false,
  size,
  className,
  ...props
}: AgenticViewTabsProps) {
  useHotkeys(
    "mod+1",
    (e) => {
      e.preventDefault();
      if (!disabled) {
        onTabChange("canvas");
      }
    },
    { enableOnFormTags: true }
  );

  useHotkeys(
    "mod+2",
    (e) => {
      e.preventDefault();
      if (!disabled) {
        onTabChange("executions");
      }
    },
    { enableOnFormTags: true }
  );

  return (
    <div
      className={cn(tabContainerVariants({ size }), className)}
      role="tablist"
      {...props}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            aria-selected={activeTab === "canvas"}
            className={cn(tabVariants({ active: activeTab === "canvas" }))}
            disabled={disabled}
            onClick={() => onTabChange("canvas")}
            role="tab"
            type="button"
          >
            <Icons.Layers className="size-4" />
            Canvas
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <span className="flex items-center gap-2">
            Canvas
            <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
              ⌘1
            </kbd>
          </span>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            aria-selected={activeTab === "executions"}
            className={cn(
              tabVariants({ active: activeTab === "executions" }),
              "relative"
            )}
            disabled={disabled}
            onClick={() => onTabChange("executions")}
            role="tab"
            type="button"
          >
            <Icons.ListTree className="size-4" />
            Executions
            {executionCount !== undefined && executionCount > 0 && (
              <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular-nums">
                {executionCount}
              </span>
            )}
            {hasLiveExecution && (
              <span className="-top-0.5 -right-0.5 absolute flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </span>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <span className="flex items-center gap-2">
            Executions
            <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
              ⌘2
            </kbd>
          </span>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

export type { AgentViewTab, AgenticViewTabsProps };
