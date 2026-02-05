"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, useState } from "react";
import { AGENT_UI_CONSTANTS } from "../../lib/agent-constants";
import { cn } from "../../utils/cn";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../collapsible";
import { Icons } from "../icons";
import { TextShimmer } from "../text-shimmer";
import { AgentToolIcon } from "./agent-tool-icon";

const agentToolCallVariants = cva("flex flex-col rounded-md border", {
  variants: {
    status: {
      pending: "border-border/50 bg-muted/30",
      running: "border-primary/30 bg-primary/5",
      success: "border-emerald-500/30 bg-emerald-500/5",
      error: "border-destructive/30 bg-destructive/5",
    },
  },
  defaultVariants: {
    status: "pending",
  },
});

type ToolCategory =
  | "search"
  | "read"
  | "write"
  | "execute"
  | "navigate"
  | "default";

type AgentToolCallProps = React.ComponentProps<"div"> &
  VariantProps<typeof agentToolCallVariants> & {
    name: string;
    displayName?: string;
    category?: ToolCategory;
    icon?: React.ReactNode;
    params?: Record<string, unknown>;
    output?: string;
    isExpandable?: boolean;
    defaultExpanded?: boolean;
  };

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength)}...`;
}

function formatParams(params: Record<string, unknown>): string {
  const entries = Object.entries(params);
  if (entries.length === 0) {
    return "";
  }
  return entries
    .map(([key, value]) => {
      const stringValue =
        typeof value === "string" ? value : JSON.stringify(value);
      return `${key}: ${truncateText(stringValue, AGENT_UI_CONSTANTS.PREVIEW_LENGTH)}`;
    })
    .join(", ");
}

const AgentToolCall = forwardRef<HTMLDivElement, AgentToolCallProps>(
  (
    {
      className,
      status,
      name,
      displayName,
      category = "default",
      icon,
      params,
      output,
      isExpandable = true,
      defaultExpanded = false,
      ...props
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(defaultExpanded);
    const hasContent = params || output;
    const canExpand = isExpandable && hasContent;

    const renderStatusIcon = () => {
      switch (status) {
        case "running":
          return (
            <Icons.Loader2 className="size-3.5 animate-spin text-primary" />
          );
        case "success":
          return <Icons.Check className="size-3.5 text-emerald-500" />;
        case "error":
          return <Icons.XCircle className="size-3.5 text-destructive" />;
        default:
          return null;
      }
    };

    const renderLabel = () => {
      const label = displayName ?? name;
      if (status === "running") {
        return (
          <TextShimmer as="span" className="text-sm" duration={1.5}>
            {label}
          </TextShimmer>
        );
      }
      return <span className="text-sm">{label}</span>;
    };

    const header = (
      <div className="flex items-center gap-2 px-3 py-2">
        <AgentToolIcon category={category} icon={icon} size="sm" />
        {renderLabel()}
        {params && status !== "running" && (
          <span className="truncate text-muted-foreground text-xs">
            {truncateText(
              formatParams(params),
              AGENT_UI_CONSTANTS.PREVIEW_LENGTH
            )}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          {renderStatusIcon()}
          {canExpand && (
            <Icons.ChevronDown
              className={cn(
                "size-3.5 text-muted-foreground transition-transform duration-200",
                isOpen && "rotate-180"
              )}
            />
          )}
        </div>
      </div>
    );

    if (!canExpand) {
      return (
        <div
          className={cn(agentToolCallVariants({ status }), className)}
          ref={ref}
          {...props}
        >
          {header}
        </div>
      );
    }

    return (
      <Collapsible asChild onOpenChange={setIsOpen} open={isOpen}>
        <div
          className={cn(agentToolCallVariants({ status }), className)}
          ref={ref}
          {...props}
        >
          <CollapsibleTrigger asChild>
            <button className="w-full text-left" type="button">
              {header}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="border-border/50 border-t px-3 py-2">
              {params && (
                <pre className="overflow-x-auto font-mono text-muted-foreground text-xs">
                  {JSON.stringify(params, null, 2)}
                </pre>
              )}
              {output && (
                <div className="mt-2 border-border/30 border-t pt-2">
                  <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs">
                    {output}
                  </pre>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  }
);
AgentToolCall.displayName = "AgentToolCall";

export { AgentToolCall, agentToolCallVariants };
export type { AgentToolCallProps, ToolCategory };
