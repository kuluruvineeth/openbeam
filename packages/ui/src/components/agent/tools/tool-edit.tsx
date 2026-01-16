"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { ChevronDown, Circle, Edit3, Minus, Plus } from "lucide-react";
import { forwardRef, useState } from "react";
import { cn } from "../../../utils/cn";
import { Button } from "../../button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../collapsible";
import { TextShimmer } from "../../text-shimmer";

const toolEditVariants = cva("rounded-md border font-mono text-xs", {
  variants: {
    status: {
      pending: "border-border/50 bg-muted/30",
      running: "border-primary/30 bg-muted/30",
      success: "border-border/50 bg-muted/30",
      error: "border-destructive/30 bg-destructive/5",
    },
  },
  defaultVariants: {
    status: "pending",
  },
});

type ToolEditStatus = "pending" | "running" | "success" | "error";

type ToolEditProps = React.ComponentProps<"div"> &
  VariantProps<typeof toolEditVariants> & {
    filePath: string;
    oldString: string;
    newString: string;
    status?: ToolEditStatus;
    replaceAll?: boolean;
    defaultExpanded?: boolean;
  };

const ToolEdit = forwardRef<HTMLDivElement, ToolEditProps>(
  (
    {
      className,
      filePath,
      oldString,
      newString,
      status = "pending",
      replaceAll = false,
      defaultExpanded = true,
      ...props
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(defaultExpanded);
    const oldLines = oldString.split("\n");
    const newLines = newString.split("\n");

    const renderStatusIndicator = () => {
      if (status === "running") {
        return (
          <Circle className="size-2 animate-pulse fill-primary text-primary" />
        );
      }
      if (status === "success") {
        return <Circle className="size-2 fill-green-500 text-green-500" />;
      }
      if (status === "error") {
        return <Circle className="size-2 fill-destructive text-destructive" />;
      }
      return (
        <Circle className="size-2 fill-muted-foreground/50 text-muted-foreground/50" />
      );
    };

    const renderHeader = () => (
      <div className="flex items-center gap-2 border-border/30 border-b px-3 py-2">
        <Edit3 className="size-3.5 text-muted-foreground" />
        {status === "running" ? (
          <TextShimmer as="span" className="font-medium text-xs" duration={1.5}>
            Editing file...
          </TextShimmer>
        ) : (
          <span
            className="flex-1 truncate text-foreground text-xs"
            title={filePath}
          >
            {filePath}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {replaceAll && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground text-xs">
              replace all
            </span>
          )}
          {renderStatusIndicator()}
        </div>
      </div>
    );

    const renderDiffLine = (
      line: string,
      type: "removed" | "added",
      index: number
    ) => {
      const isRemoved = type === "removed";
      return (
        <div
          className={cn(
            "flex items-start gap-2 px-3 py-0.5",
            isRemoved ? "bg-red-500/10" : "bg-green-500/10"
          )}
          key={`${type}-${index}`}
        >
          <span
            className={cn(
              "w-4 select-none text-center",
              isRemoved ? "text-red-500" : "text-green-500"
            )}
          >
            {isRemoved ? (
              <Minus className="size-3" />
            ) : (
              <Plus className="size-3" />
            )}
          </span>
          <pre
            className={cn(
              "flex-1 whitespace-pre-wrap break-all",
              isRemoved ? "text-red-400" : "text-green-400"
            )}
          >
            {line || " "}
          </pre>
        </div>
      );
    };

    const renderDiff = () => (
      <div className="divide-y divide-border/20">
        <div className="py-1">
          {oldLines.map((line, i) => renderDiffLine(line, "removed", i))}
        </div>
        <div className="py-1">
          {newLines.map((line, i) => renderDiffLine(line, "added", i))}
        </div>
      </div>
    );

    const totalLines = oldLines.length + newLines.length;
    const isLongDiff = totalLines > 10;

    if (!isLongDiff) {
      return (
        <div
          className={cn(toolEditVariants({ status }), className)}
          ref={ref}
          {...props}
        >
          {renderHeader()}
          {renderDiff()}
        </div>
      );
    }

    return (
      <Collapsible asChild onOpenChange={setIsOpen} open={isOpen}>
        <div
          className={cn(toolEditVariants({ status }), className)}
          ref={ref}
          {...props}
        >
          {renderHeader()}
          <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
            {renderDiff()}
          </CollapsibleContent>
          <CollapsibleTrigger asChild>
            <Button
              className="h-7 w-full rounded-none rounded-b-md border-border/30 border-t text-muted-foreground hover:text-foreground"
              size="sm"
              variant="ghost"
            >
              <span className="flex items-center gap-2 text-xs">
                <span className="text-red-400">-{oldLines.length}</span>
                <span className="text-green-400">+{newLines.length}</span>
                <span>{isOpen ? "Hide diff" : "Show diff"}</span>
              </span>
              <ChevronDown
                className={cn(
                  "ml-1 size-3 transition-transform duration-200",
                  isOpen && "rotate-180"
                )}
              />
            </Button>
          </CollapsibleTrigger>
        </div>
      </Collapsible>
    );
  }
);
ToolEdit.displayName = "ToolEdit";

export { ToolEdit, toolEditVariants };
export type { ToolEditProps, ToolEditStatus };
