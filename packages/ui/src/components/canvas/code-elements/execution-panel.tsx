"use client";

import type {
  CodeExecutionResult,
  ConsoleLogEntry,
} from "@openbeam/types/canvas";
import { memo, useMemo } from "react";
import { cn } from "../../../utils";
import { Badge } from "../../badge";
import { Icons } from "../../icons";
import { ScrollArea } from "../../scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../tabs";

export interface ExecutionPanelProps {
  result?: CodeExecutionResult;
  isRunning?: boolean;
  className?: string;
}

const LOG_LEVEL_CONFIG = {
  log: { icon: "Code" as const, color: "text-muted-foreground" },
  info: { icon: "Info" as const, color: "text-blue-500" },
  warn: { icon: "AlertTriangle" as const, color: "text-yellow-500" },
  error: { icon: "AlertCircle" as const, color: "text-red-500" },
};

function formatOutput(output: unknown): string {
  if (output === undefined) {
    return "undefined";
  }
  if (output === null) {
    return "null";
  }
  if (typeof output === "string") {
    return output;
  }
  try {
    return JSON.stringify(output, null, 2);
  } catch {
    return String(output);
  }
}

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
  });
}

const LogEntry = memo(function LogEntryComponent({
  entry,
}: {
  entry: ConsoleLogEntry;
}) {
  const config = LOG_LEVEL_CONFIG[entry.level];
  const Icon = Icons[config.icon];

  return (
    <div className="flex items-start gap-2 border-border/30 border-b py-1.5 font-mono text-xs last:border-0">
      <Icon className={cn("mt-0.5 size-3.5 shrink-0", config.color)} />
      <span className="shrink-0 text-muted-foreground">
        {formatTimestamp(entry.timestamp)}
      </span>
      <span className="min-w-0 flex-1 whitespace-pre-wrap break-all">
        {entry.message}
      </span>
    </div>
  );
});

LogEntry.displayName = "LogEntry";

export const ExecutionPanel = memo(function ExecutionPanelComponent({
  result,
  isRunning,
  className,
}: ExecutionPanelProps) {
  const logCounts = useMemo(() => {
    if (!result?.logs) {
      return { log: 0, info: 0, warn: 0, error: 0, total: 0 };
    }
    const counts = { log: 0, info: 0, warn: 0, error: 0, total: 0 };
    for (const log of result.logs) {
      counts[log.level] += 1;
      counts.total += 1;
    }
    return counts;
  }, [result?.logs]);

  if (isRunning) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-md border border-border/50 py-8",
          className
        )}
      >
        <div className="flex flex-col items-center gap-2">
          <Icons.Loader2 className="size-6 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground text-sm">Executing code...</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-md border border-border/50 border-dashed py-8",
          className
        )}
      >
        <div className="flex flex-col items-center gap-2">
          <Icons.Play className="size-6 text-muted-foreground/50" />
          <p className="text-muted-foreground text-sm">No execution results</p>
          <p className="text-muted-foreground/70 text-xs">
            Run the code to see output
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-md border border-border/50", className)}>
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          {result.success ? (
            <Badge className="gap-1" variant="default">
              <Icons.Check className="size-3" />
              Success
            </Badge>
          ) : (
            <Badge className="gap-1" variant="destructive">
              <Icons.XIcon className="size-3" />
              Error
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 text-muted-foreground text-xs">
          <span className="flex items-center gap-1">
            <Icons.Clock className="size-3" />
            {result.executionTimeMs.toFixed(0)}ms
          </span>
          {result.memoryUsedBytes && (
            <span className="flex items-center gap-1">
              <Icons.BrainCircuit className="size-3" />
              {(result.memoryUsedBytes / 1024 / 1024).toFixed(1)}MB
            </span>
          )}
        </div>
      </div>

      <Tabs defaultValue="output">
        <TabsList className="h-9 w-full justify-start rounded-none border-b bg-transparent px-2">
          <TabsTrigger
            className="h-7 gap-1.5 px-2 text-xs data-[state=active]:bg-muted"
            value="output"
          >
            <Icons.Code className="size-3.5" />
            Output
          </TabsTrigger>
          <TabsTrigger
            className="h-7 gap-1.5 px-2 text-xs data-[state=active]:bg-muted"
            value="logs"
          >
            <Icons.FileText className="size-3.5" />
            Logs
            {logCounts.total > 0 && (
              <Badge className="ml-1 h-4 px-1 text-[10px]" variant="secondary">
                {logCounts.total}
              </Badge>
            )}
          </TabsTrigger>
          {result.error && (
            <TabsTrigger
              className="h-7 gap-1.5 px-2 text-destructive text-xs data-[state=active]:bg-destructive/10"
              value="error"
            >
              <Icons.AlertCircle className="size-3.5" />
              Error
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent className="m-0" value="output">
          <ScrollArea className="h-[200px]">
            <pre className="whitespace-pre-wrap break-all p-3 font-mono text-xs">
              {formatOutput(result.output)}
            </pre>
          </ScrollArea>
        </TabsContent>

        <TabsContent className="m-0" value="logs">
          <ScrollArea className="h-[200px]">
            {logCounts.total === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-muted-foreground text-xs">No console logs</p>
              </div>
            ) : (
              <div className="px-3 py-1">
                {result.logs.map((log, index) => (
                  <LogEntry entry={log} key={`${log.timestamp}-${index}`} />
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        {result.error && (
          <TabsContent className="m-0" value="error">
            <ScrollArea className="h-[200px]">
              <div className="space-y-2 p-3">
                <div className="rounded-md bg-destructive/10 p-3">
                  <p className="font-medium text-destructive text-sm">
                    {result.error.message}
                  </p>
                  {result.error.line && (
                    <p className="mt-1 text-muted-foreground text-xs">
                      Line {result.error.line}
                      {result.error.column && `, Column ${result.error.column}`}
                    </p>
                  )}
                </div>
                {result.error.stack && (
                  <pre className="whitespace-pre-wrap break-all rounded-md bg-muted p-2 font-mono text-xs">
                    {result.error.stack}
                  </pre>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
});

ExecutionPanel.displayName = "ExecutionPanel";
