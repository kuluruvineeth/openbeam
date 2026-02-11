"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "framer-motion";
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

const agentToolCallVariants = cva("flex flex-col rounded-md", {
  variants: {
    status: {
      pending: "bg-muted/30",
      running: "bg-primary/5",
      success: "bg-emerald-500/5",
      error: "bg-destructive/5",
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
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(defaultExpanded);
    const hasParams = params && Object.keys(params).length > 0;
    const hasContent = hasParams || output;
    const canExpand = isExpandable && hasContent;

    const renderStatusIcon = () => {
      switch (status) {
        case "success":
          return <Icons.Check className="size-3.5 text-emerald-500" />;
        case "error":
          return <Icons.XCircle className="size-3.5 text-destructive" />;
        default:
          return null;
      }
    };

    const header = (
      <div className="flex min-w-0 items-center gap-2 overflow-hidden px-3 py-2">
        <AgentToolIcon category={category} icon={icon} size="sm" />
        <span className="shrink-0 text-sm">
          {status === "running" ? (
            <TextShimmer as="span" duration={1.5}>
              {displayName ?? name}
            </TextShimmer>
          ) : (
            (displayName ?? name)
          )}
        </span>
        {hasParams && status !== "running" && (
          <span className="min-w-0 truncate text-muted-foreground text-xs">
            {truncateText(
              formatParams(params),
              AGENT_UI_CONSTANTS.PREVIEW_LENGTH
            )}
          </span>
        )}
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
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
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className={cn(agentToolCallVariants({ status }), className)}
          initial={{ opacity: 0, y: 4 }}
          ref={ref}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {header}
        </motion.div>
      );
    }

    return (
      <Collapsible onOpenChange={setIsOpen} open={isOpen}>
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className={cn(agentToolCallVariants({ status }), className)}
          initial={{ opacity: 0, y: 4 }}
          ref={ref}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <CollapsibleTrigger asChild>
            <button className="w-full text-left" type="button">
              {header}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-3 py-2">
              {hasParams && (
                <pre className="overflow-x-auto font-mono text-muted-foreground text-xs">
                  {JSON.stringify(params, null, 2)}
                </pre>
              )}
              {output && (
                <div className="mt-2 pt-2">
                  <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs">
                    {output}
                  </pre>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </motion.div>
      </Collapsible>
    );
  }
);
AgentToolCall.displayName = "AgentToolCall";

export { AgentToolCall, agentToolCallVariants };
export type { AgentToolCallProps, ToolCategory };
