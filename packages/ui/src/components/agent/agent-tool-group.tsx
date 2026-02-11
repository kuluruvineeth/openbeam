"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "framer-motion";
import { forwardRef, useState } from "react";
import { AGENT_UI_CONSTANTS } from "../../lib/agent-constants";
import { getToolCategory, getToolIcon } from "../../lib/tool-registry";
import { cn } from "../../utils/cn";
import { Button } from "../button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../collapsible";
import { Icons } from "../icons";
import { TextShimmer } from "../text-shimmer";
import { AgentToolIcon } from "./agent-tool-icon";

const agentToolGroupVariants = cva("rounded-md", {
  variants: {
    status: {
      pending: "bg-muted/30",
      running: "bg-muted/30",
      completed: "bg-muted/30",
      error: "bg-destructive/5",
    },
  },
  defaultVariants: {
    status: "pending",
  },
});

type AgentToolGroupStatus = "pending" | "running" | "completed" | "error";

interface GroupedTool {
  id: string;
  name: string;
  status: "pending" | "running" | "success" | "error";
  summary?: string;
}

type AgentToolGroupProps = React.ComponentProps<"div"> &
  VariantProps<typeof agentToolGroupVariants> & {
    tools: GroupedTool[];
    status?: AgentToolGroupStatus;
    label?: string;
    defaultExpanded?: boolean;
  };

const AgentToolGroup = forwardRef<HTMLDivElement, AgentToolGroupProps>(
  (
    { className, tools, status = "pending", label, defaultExpanded = false },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(defaultExpanded);
    const completedCount = tools.filter((t) => t.status === "success").length;
    const totalCount = tools.length;
    const isRunning =
      status === "running" || tools.some((t) => t.status === "running");
    const hasError = tools.some((t) => t.status === "error");

    const groupLabel =
      label ??
      (totalCount >= AGENT_UI_CONSTANTS.MIN_GROUP_SIZE
        ? "Exploration"
        : `${totalCount} tools`);

    const renderHeader = () => (
      <div className="flex min-w-0 items-center gap-2 overflow-hidden px-3 py-2">
        <Icons.FolderSearch className="size-3.5 shrink-0 text-muted-foreground" />
        {isRunning ? (
          <TextShimmer as="span" className="font-medium text-sm" duration={1.5}>
            {groupLabel}...
          </TextShimmer>
        ) : (
          <span className="font-medium text-foreground text-sm">
            {groupLabel}
          </span>
        )}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <span className="text-muted-foreground text-xs tabular-nums">
            {completedCount}/{totalCount}
          </span>
          {hasError && (
            <span className="text-destructive text-xs">
              {tools.filter((t) => t.status === "error").length} failed
            </span>
          )}
        </div>
      </div>
    );

    const renderToolItem = (tool: GroupedTool) => {
      const category = getToolCategory(tool.name);
      const Icon = getToolIcon(tool.name);

      return (
        <div
          className={cn(
            "flex min-w-0 items-center gap-2 overflow-hidden px-3 py-1.5",
            tool.status === "error" && "bg-destructive/5"
          )}
          key={tool.id}
        >
          <AgentToolIcon category={category} size="sm">
            <Icon className="size-3" />
          </AgentToolIcon>
          <span className="flex-1 truncate text-muted-foreground text-xs">
            {tool.name}
          </span>
          {tool.summary && (
            <span className="max-w-[40%] truncate text-muted-foreground/70 text-xs">
              {tool.summary}
            </span>
          )}
        </div>
      );
    };

    if (totalCount <= 2) {
      return (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className={cn(agentToolGroupVariants({ status }), className)}
          initial={{ opacity: 0, y: 4 }}
          ref={ref}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {renderHeader()}
          {tools.map(renderToolItem)}
        </motion.div>
      );
    }

    return (
      <Collapsible onOpenChange={setIsOpen} open={isOpen}>
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className={cn(agentToolGroupVariants({ status }), className)}
          initial={{ opacity: 0, y: 4 }}
          ref={ref}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <CollapsibleTrigger asChild>
            <Button
              className="h-auto w-full p-0 hover:bg-transparent"
              variant="ghost"
            >
              {renderHeader()}
              <Icons.ChevronDown
                className={cn(
                  "mr-3 size-3.5 text-muted-foreground transition-transform duration-200",
                  isOpen && "rotate-180"
                )}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
            {tools.map(renderToolItem)}
          </CollapsibleContent>
          {!isOpen && (
            <div className="flex items-center gap-1 px-3 py-1.5">
              <Icons.Layers className="size-3 text-muted-foreground" />
              <span className="text-muted-foreground text-xs">
                {totalCount} tools grouped
              </span>
            </div>
          )}
        </motion.div>
      </Collapsible>
    );
  }
);
AgentToolGroup.displayName = "AgentToolGroup";

export { AgentToolGroup, agentToolGroupVariants };
export type { AgentToolGroupProps, AgentToolGroupStatus, GroupedTool };
