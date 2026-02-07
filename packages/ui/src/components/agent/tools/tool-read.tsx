"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, useState } from "react";
import { AGENT_UI_CONSTANTS } from "../../../lib/agent-constants";
import { cn } from "../../../utils/cn";
import { Button } from "../../button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../collapsible";
import { Icons } from "../../icons";
import { TextShimmer } from "../../text-shimmer";

const toolReadVariants = cva("rounded-md border font-mono text-xs", {
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

type ToolReadStatus = "pending" | "running" | "success" | "error";

type ToolReadProps = React.ComponentProps<"div"> &
  VariantProps<typeof toolReadVariants> & {
    filePath: string;
    content?: string;
    status?: ToolReadStatus;
    startLine?: number;
    lineCount?: number;
    defaultExpanded?: boolean;
    maxPreviewLines?: number;
  };

const ToolRead = forwardRef<HTMLDivElement, ToolReadProps>(
  (
    {
      className,
      filePath,
      content,
      status = "pending",
      startLine = 1,
      lineCount,
      defaultExpanded = false,
      maxPreviewLines = AGENT_UI_CONSTANTS.MAX_OUTPUT_LINES,
      ...props
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(defaultExpanded);
    const hasContent = content && content.length > 0;
    const lines = content?.split("\n") ?? [];
    const totalLines = lines.length;
    const isLongFile = totalLines > maxPreviewLines;

    const renderStatusIndicator = () => {
      if (status === "running") {
        return (
          <Icons.Circle className="size-2 animate-pulse fill-primary text-primary" />
        );
      }
      if (status === "success") {
        return (
          <Icons.Circle className="size-2 fill-green-500 text-green-500" />
        );
      }
      if (status === "error") {
        return (
          <Icons.Circle className="size-2 fill-destructive text-destructive" />
        );
      }
      return (
        <Icons.Circle className="size-2 fill-muted-foreground/50 text-muted-foreground/50" />
      );
    };

    const renderHeader = () => (
      <div className="flex items-center gap-2 border-border/30 border-b px-3 py-2">
        <Icons.Eye className="size-3.5 text-muted-foreground" />
        {status === "running" ? (
          <TextShimmer as="span" className="font-medium text-xs" duration={1.5}>
            Reading file...
          </TextShimmer>
        ) : (
          <>
            <Icons.File className="size-3.5 text-muted-foreground" />
            <span
              className="flex-1 truncate text-foreground text-xs"
              title={filePath}
            >
              {filePath}
            </span>
          </>
        )}
        <div className="ml-auto flex items-center gap-2">
          {lineCount != null && (
            <span className="text-muted-foreground text-xs tabular-nums">
              {lineCount} lines
            </span>
          )}
          {renderStatusIndicator()}
        </div>
      </div>
    );

    const renderLineNumber = (lineNum: number) => (
      <span className="w-8 select-none pr-3 text-right text-muted-foreground/50 tabular-nums">
        {lineNum}
      </span>
    );

    const renderContent = (linesToShow: string[], startFrom: number) => (
      <div className="overflow-x-auto bg-background/50 px-3 py-2">
        {linesToShow.map((line, i) => (
          <div
            className="flex"
            key={`line-${startFrom + i}-${line.slice(0, 20)}`}
          >
            {renderLineNumber(startFrom + i)}
            <pre className="flex-1 whitespace-pre text-foreground">
              {line || " "}
            </pre>
          </div>
        ))}
      </div>
    );

    if (!hasContent) {
      return (
        <div
          className={cn(toolReadVariants({ status }), className)}
          ref={ref}
          {...props}
        >
          {renderHeader()}
          {status === "success" && (
            <div className="px-3 py-4 text-center text-muted-foreground text-xs">
              File is empty
            </div>
          )}
        </div>
      );
    }

    if (!isLongFile) {
      return (
        <div
          className={cn(toolReadVariants({ status }), className)}
          ref={ref}
          {...props}
        >
          {renderHeader()}
          {renderContent(lines, startLine)}
        </div>
      );
    }

    const previewLines = lines.slice(0, maxPreviewLines);

    return (
      <Collapsible asChild onOpenChange={setIsOpen} open={isOpen}>
        <div
          className={cn(toolReadVariants({ status }), className)}
          ref={ref}
          {...props}
        >
          {renderHeader()}
          {!isOpen && renderContent(previewLines, startLine)}
          <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
            {renderContent(lines, startLine)}
          </CollapsibleContent>
          <CollapsibleTrigger asChild>
            <Button
              className="h-7 w-full rounded-none rounded-b-md border-border/30 border-t text-muted-foreground hover:text-foreground"
              size="sm"
              variant="ghost"
            >
              <span className="text-xs">
                {isOpen ? "Show less" : `Show all ${totalLines} lines`}
              </span>
              <Icons.ChevronDown
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
ToolRead.displayName = "ToolRead";

export { ToolRead, toolReadVariants };
export type { ToolReadProps, ToolReadStatus };
