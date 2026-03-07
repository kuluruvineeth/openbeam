"use client";

import type { StepDetail } from "@openbeam/types/canvas/execution-ui";
import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import { formatDurationPrecise } from "../../utils/format";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../accordion";
import { Button } from "../button";
import { Icons } from "../icons";
import { ScrollArea } from "../scroll-area";
import { getNodeIcon } from "./timeline-step";

type StepDetailPanelProps = React.ComponentProps<"div"> & {
  step: StepDetail;
  onClose?: () => void;
  onRerun?: (stepId: string) => void;
};

const logLevelColors: Record<string, string> = {
  debug: "text-muted-foreground",
  info: "text-foreground",
  warn: "text-orange-500",
  error: "text-destructive",
};

const statusDotColors: Record<string, string> = {
  pending: "bg-muted-foreground",
  queued: "bg-muted-foreground",
  running: "bg-foreground",
  success: "bg-[#00C853]",
  error: "bg-destructive",
  skipped: "bg-muted-foreground",
  cancelled: "bg-muted-foreground",
};

function getEmptyStateMessage(status: string): string {
  if (status === "pending" || status === "queued") {
    return "This step hasn't started yet.";
  }
  if (status === "running") {
    return "Data will appear when the step completes.";
  }
  return "This step completed without input or output data.";
}

const StepDetailPanel = forwardRef<HTMLDivElement, StepDetailPanelProps>(
  ({ step, onClose, onRerun, className, ...props }, ref) => {
    const Icon = getNodeIcon(step.nodeType);
    const hasInput = step.input !== undefined;
    const hasOutput = step.output !== undefined;
    const hasError = Boolean(step.error);
    const hasLogs = (step.logs?.length ?? 0) > 0;
    const hasRetries = (step.retryHistory?.length ?? 0) > 0;
    const hasTokenUsage = step.tokenUsage !== undefined;
    const hasNoData = !(
      hasInput ||
      hasOutput ||
      hasError ||
      hasLogs ||
      hasRetries ||
      hasTokenUsage
    );
    const dotColor = statusDotColors[step.status] ?? "bg-muted-foreground";
    const isRunning = step.status === "running";

    return (
      <div
        className={cn(
          "flex h-full min-h-0 flex-col overflow-hidden",
          className
        )}
        ref={ref}
        {...props}
      >
        <div className="flex shrink-0 items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="relative flex shrink-0 items-center justify-center">
              <span
                className={cn(
                  "size-[6px] rounded-full",
                  dotColor,
                  isRunning && "animate-pulse"
                )}
              />
              {isRunning && (
                <span
                  className={cn(
                    "absolute size-[6px] animate-ping rounded-full",
                    dotColor,
                    "opacity-75"
                  )}
                />
              )}
            </div>
            <div className="flex items-center gap-2">
              <Icon className="size-3.5 text-muted-foreground" />
              <span className="font-medium text-[13px]">{step.nodeName}</span>
            </div>
          </div>
          {onClose && (
            <Button
              className="size-6"
              onClick={onClose}
              size="icon"
              variant="ghost"
            >
              <Icons.X className="size-3.5" />
            </Button>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-4 border-border/20 border-b px-4 py-2.5">
          {step.durationMs != null && (
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                Duration
              </span>
              <span className="font-medium text-xs tabular-nums">
                {formatDurationPrecise(step.durationMs)}
              </span>
            </div>
          )}
          {hasTokenUsage && (
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                Tokens
              </span>
              <span className="font-medium text-xs tabular-nums">
                {(
                  (step.tokenUsage?.input ?? 0) + (step.tokenUsage?.output ?? 0)
                ).toLocaleString()}
              </span>
            </div>
          )}
          {hasRetries && (
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                Retries
              </span>
              <span className="font-medium text-xs tabular-nums">
                {step.retryHistory?.length ?? 0}
              </span>
            </div>
          )}
          {onRerun && (
            <button
              className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => onRerun(step.id)}
              type="button"
            >
              <Icons.RefreshCw className="size-3" />
              Rerun
            </button>
          )}
        </div>

        <ScrollArea className="flex-1">
          {hasNoData ? (
            <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
              <div className="flex size-10 items-center justify-center rounded-full bg-muted/50">
                <Icon className="size-4 text-muted-foreground" />
              </div>
              <p className="mt-3 font-medium text-sm">No data available</p>
              <p className="mt-1 max-w-[200px] text-muted-foreground text-xs">
                {getEmptyStateMessage(step.status)}
              </p>
            </div>
          ) : (
            <Accordion
              className="px-4 py-2"
              defaultValue={[
                hasError ? "error" : "",
                hasOutput ? "output" : "",
                hasInput ? "input" : "",
              ].filter(Boolean)}
              type="multiple"
            >
              {hasError && (
                <AccordionItem className="border-b-0" value="error">
                  <AccordionTrigger className="py-2 text-xs hover:no-underline">
                    <span className="text-destructive">Error</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      <p className="text-destructive text-xs">{step.error}</p>
                      {step.stackTrace && (
                        <pre className="overflow-x-auto rounded-sm bg-muted/50 p-2 text-[10px]">
                          {step.stackTrace}
                        </pre>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {hasInput && (
                <AccordionItem className="border-b-0" value="input">
                  <AccordionTrigger className="py-2 text-muted-foreground text-xs hover:text-foreground hover:no-underline">
                    Input
                  </AccordionTrigger>
                  <AccordionContent>
                    <pre className="overflow-x-auto rounded-sm bg-muted/50 p-2 text-[10px]">
                      {JSON.stringify(step.input, null, 2)}
                    </pre>
                  </AccordionContent>
                </AccordionItem>
              )}

              {hasOutput && (
                <AccordionItem className="border-b-0" value="output">
                  <AccordionTrigger className="py-2 text-muted-foreground text-xs hover:text-foreground hover:no-underline">
                    Output
                  </AccordionTrigger>
                  <AccordionContent>
                    <pre className="overflow-x-auto rounded-sm bg-muted/50 p-2 text-[10px]">
                      {JSON.stringify(step.output, null, 2)}
                    </pre>
                  </AccordionContent>
                </AccordionItem>
              )}

              {hasLogs && (
                <AccordionItem className="border-b-0" value="logs">
                  <AccordionTrigger className="py-2 text-muted-foreground text-xs hover:text-foreground hover:no-underline">
                    Logs ({step.logs?.length})
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-0.5 font-mono text-[10px]">
                      {step.logs?.map((log, index) => (
                        <div
                          className={cn(
                            "flex gap-2 rounded-sm px-1.5 py-0.5",
                            log.level === "error" && "bg-destructive/10",
                            log.level === "warn" && "bg-orange-500/10"
                          )}
                          key={`log-${log.timestamp}-${index}`}
                        >
                          <span className="shrink-0 text-muted-foreground">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                          <span
                            className={cn(
                              "uppercase",
                              logLevelColors[log.level]
                            )}
                          >
                            {log.level}
                          </span>
                          <span className={logLevelColors[log.level]}>
                            {log.message}
                          </span>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {hasRetries && (
                <AccordionItem className="border-b-0" value="retries">
                  <AccordionTrigger className="py-2 text-muted-foreground text-xs hover:text-foreground hover:no-underline">
                    Retries ({step.retryHistory?.length})
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-1">
                      {step.retryHistory?.map((retry) => (
                        <div
                          className="flex items-center justify-between rounded-sm bg-muted/50 px-2 py-1.5 text-[10px]"
                          key={retry.attempt}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              #{retry.attempt}
                            </span>
                            <span className="text-muted-foreground">
                              {new Date(retry.startedAt).toLocaleTimeString()}
                            </span>
                          </div>
                          {retry.error && (
                            <span className="line-clamp-1 max-w-[180px] text-destructive">
                              {retry.error}
                            </span>
                          )}
                          {retry.completedAt && (
                            <span className="text-muted-foreground tabular-nums">
                              {formatDurationPrecise(
                                retry.completedAt - retry.startedAt
                              )}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {hasTokenUsage && (
                <AccordionItem className="border-b-0" value="tokens">
                  <AccordionTrigger className="py-2 text-muted-foreground text-xs hover:text-foreground hover:no-underline">
                    Token Usage
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-sm bg-muted/50 p-2">
                        <p className="text-[10px] text-muted-foreground">
                          Input
                        </p>
                        <p className="font-medium text-xs tabular-nums">
                          {step.tokenUsage?.input.toLocaleString()}
                        </p>
                      </div>
                      <div className="rounded-sm bg-muted/50 p-2">
                        <p className="text-[10px] text-muted-foreground">
                          Output
                        </p>
                        <p className="font-medium text-xs tabular-nums">
                          {step.tokenUsage?.output.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          )}
        </ScrollArea>
      </div>
    );
  }
);
StepDetailPanel.displayName = "StepDetailPanel";

export { StepDetailPanel };
export type { StepDetailPanelProps };
