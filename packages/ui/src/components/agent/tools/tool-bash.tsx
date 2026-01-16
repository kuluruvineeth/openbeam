"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { ChevronDown, Circle, Terminal } from "lucide-react";
import { forwardRef, useState } from "react";
import { AGENT_UI_CONSTANTS } from "../../../lib/agent-constants";
import { cn } from "../../../utils/cn";
import { Button } from "../../button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../collapsible";
import { TextShimmer } from "../../text-shimmer";

const toolBashVariants = cva("rounded-md border font-mono text-xs", {
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

type ToolBashStatus = "pending" | "running" | "success" | "error";

type ToolBashProps = React.ComponentProps<"div"> &
  VariantProps<typeof toolBashVariants> & {
    command: string;
    output?: string;
    exitCode?: number | null;
    status?: ToolBashStatus;
    description?: string;
    isCollapsible?: boolean;
    defaultExpanded?: boolean;
    maxOutputLines?: number;
  };

const ToolBash = forwardRef<HTMLDivElement, ToolBashProps>(
  (
    {
      className,
      command,
      output,
      exitCode,
      status = "pending",
      description,
      isCollapsible = true,
      defaultExpanded = false,
      maxOutputLines = AGENT_UI_CONSTANTS.MAX_OUTPUT_LINES,
      ...props
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(defaultExpanded);
    const hasOutput = output && output.length > 0;
    const outputLines = output?.split("\n") ?? [];
    const isOutputTruncated = outputLines.length > maxOutputLines;
    const displayOutput =
      isOutputTruncated && !isOpen
        ? `${outputLines.slice(0, maxOutputLines).join("\n")}\n...`
        : output;

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
        <Terminal className="size-3.5 text-muted-foreground" />
        {status === "running" ? (
          <TextShimmer as="span" className="font-medium text-xs" duration={1.5}>
            Running command...
          </TextShimmer>
        ) : (
          <span className="text-muted-foreground text-xs">
            {description ?? "Terminal"}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {renderStatusIndicator()}
          {exitCode != null && (
            <span
              className={cn(
                "text-xs tabular-nums",
                exitCode === 0 ? "text-green-500" : "text-destructive"
              )}
            >
              exit {exitCode}
            </span>
          )}
        </div>
      </div>
    );

    const renderCommand = () => (
      <div className="bg-background/50 px-3 py-2">
        <div className="flex items-start gap-2">
          <span className="select-none text-green-500">$</span>
          <pre className="flex-1 whitespace-pre-wrap break-all text-foreground">
            {command}
          </pre>
        </div>
      </div>
    );

    const renderOutput = () => {
      if (!hasOutput) {
        return null;
      }

      return (
        <div className="border-border/30 border-t bg-muted/20 px-3 py-2">
          <pre className="whitespace-pre-wrap break-all text-muted-foreground">
            {displayOutput}
          </pre>
        </div>
      );
    };

    if (!(isCollapsible && hasOutput)) {
      return (
        <div
          className={cn(toolBashVariants({ status }), className)}
          ref={ref}
          {...props}
        >
          {renderHeader()}
          {renderCommand()}
          {renderOutput()}
        </div>
      );
    }

    return (
      <Collapsible asChild onOpenChange={setIsOpen} open={isOpen}>
        <div
          className={cn(toolBashVariants({ status }), className)}
          ref={ref}
          {...props}
        >
          {renderHeader()}
          {renderCommand()}
          {hasOutput && (
            <>
              <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                <div className="border-border/30 border-t bg-muted/20 px-3 py-2">
                  <pre className="whitespace-pre-wrap break-all text-muted-foreground">
                    {output}
                  </pre>
                </div>
              </CollapsibleContent>
              {isOutputTruncated && (
                <CollapsibleTrigger asChild>
                  <Button
                    className="h-7 w-full rounded-none rounded-b-md border-border/30 border-t text-muted-foreground hover:text-foreground"
                    size="sm"
                    variant="ghost"
                  >
                    <span className="text-xs">
                      {isOpen
                        ? "Show less"
                        : `Show all ${outputLines.length} lines`}
                    </span>
                    <ChevronDown
                      className={cn(
                        "ml-1 size-3 transition-transform duration-200",
                        isOpen && "rotate-180"
                      )}
                    />
                  </Button>
                </CollapsibleTrigger>
              )}
            </>
          )}
        </div>
      </Collapsible>
    );
  }
);
ToolBash.displayName = "ToolBash";

export { ToolBash, toolBashVariants };
export type { ToolBashProps, ToolBashStatus };
