"use client";

import { forwardRef } from "react";
import { getToolCategory } from "../../lib/tool-registry";
import { cn } from "../../utils/cn";
import { Icons } from "../icons";
import { AgentStatus } from "./agent-status";
import { AgentThinking } from "./agent-thinking";
import { AgentToolCall } from "./agent-tool-call";
import { StreamingText } from "./streaming-text";

type AgentEventType =
  | "thinking"
  | "status"
  | "tool_call"
  | "tool_result"
  | "text"
  | "error"
  | "done";

interface ThinkingEvent {
  type: "thinking";
  timestamp: number;
  message: string;
}

interface StatusEvent {
  type: "status";
  timestamp: number;
  status: string;
  message: string;
}

interface ToolCallEvent {
  type: "tool_call";
  timestamp: number;
  toolCallId: string;
  toolName: string;
  toolInput?: unknown;
  displayName: string;
}

interface ToolResultEvent {
  type: "tool_result";
  timestamp: number;
  toolCallId: string;
  toolName: string;
  toolOutput?: unknown;
  durationMs?: number;
  success: boolean;
}

interface TextEvent {
  type: "text";
  timestamp: number;
  content: string;
  isPartial: boolean;
}

interface ErrorEvent {
  type: "error";
  timestamp: number;
  code: string;
  message: string;
  retryable: boolean;
}

interface DoneEvent {
  type: "done";
  timestamp: number;
  success: boolean;
}

type AgentEvent =
  | ThinkingEvent
  | StatusEvent
  | ToolCallEvent
  | ToolResultEvent
  | TextEvent
  | ErrorEvent
  | DoneEvent;

type AgentEventRendererProps = React.ComponentProps<"div"> & {
  event: AgentEvent;
  isStreaming?: boolean;
  defaultExpanded?: boolean;
  onToolClick?: (toolCallId: string) => void;
};

const ThinkingRenderer = forwardRef<
  HTMLDivElement,
  { event: ThinkingEvent; isActive?: boolean }
>(({ event, isActive }, ref) => (
  <AgentThinking content={event.message} isActive={isActive} ref={ref} />
));
ThinkingRenderer.displayName = "ThinkingRenderer";

const StatusRenderer = forwardRef<HTMLDivElement, { event: StatusEvent }>(
  ({ event }, ref) => (
    <AgentStatus isActive ref={ref} status="streaming">
      {event.message}
    </AgentStatus>
  )
);
StatusRenderer.displayName = "StatusRenderer";

const ToolCallRenderer = forwardRef<
  HTMLDivElement,
  {
    event: ToolCallEvent;
    result?: ToolResultEvent;
    defaultExpanded?: boolean;
    onClick?: () => void;
  }
>(({ event, result, defaultExpanded, onClick }, ref) => {
  const status = result ? (result.success ? "success" : "error") : "running";
  const category = getToolCategory(event.toolName);
  const params =
    event.toolInput && typeof event.toolInput === "object"
      ? (event.toolInput as Record<string, unknown>)
      : undefined;
  const output =
    result?.toolOutput != null ? String(result.toolOutput) : undefined;

  return (
    <AgentToolCall
      category={category}
      defaultExpanded={defaultExpanded}
      displayName={event.displayName}
      name={event.toolName}
      onClick={onClick}
      output={output}
      params={params}
      ref={ref}
      status={status}
    />
  );
});
ToolCallRenderer.displayName = "ToolCallRenderer";

const TextRenderer = forwardRef<
  HTMLDivElement,
  { event: TextEvent; isStreaming?: boolean; className?: string }
>(({ event, isStreaming, className }, ref) => (
  <div
    className={cn("prose prose-sm dark:prose-invert max-w-none", className)}
    ref={ref}
  >
    <StreamingText isStreaming={isStreaming && event.isPartial}>
      {event.content}
    </StreamingText>
  </div>
));
TextRenderer.displayName = "TextRenderer";

const ErrorRenderer = forwardRef<
  HTMLDivElement,
  { event: ErrorEvent; className?: string }
>(({ event, className }, ref) => (
  <div
    className={cn(
      "flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2",
      className
    )}
    ref={ref}
  >
    <Icons.AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
    <div className="min-w-0 flex-1">
      <p className="font-medium text-destructive text-sm">{event.code}</p>
      <p className="text-destructive/80 text-sm">{event.message}</p>
      {event.retryable && (
        <p className="mt-1 text-muted-foreground text-xs">
          This error can be retried
        </p>
      )}
    </div>
  </div>
));
ErrorRenderer.displayName = "ErrorRenderer";

const DoneRenderer = forwardRef<
  HTMLDivElement,
  { event: DoneEvent; className?: string }
>(({ event, className }, ref) => (
  <div
    className={cn(
      "flex items-center gap-2 rounded-md border px-3 py-2",
      event.success
        ? "border-green-500/30 bg-green-500/5"
        : "border-destructive/30 bg-destructive/5",
      className
    )}
    ref={ref}
  >
    {event.success ? (
      <Icons.CheckCircle2 className="size-4 text-green-500" />
    ) : (
      <Icons.XCircle className="size-4 text-destructive" />
    )}
    <span className="text-muted-foreground text-sm">
      {event.success ? "Completed successfully" : "Completed with errors"}
    </span>
  </div>
));
DoneRenderer.displayName = "DoneRenderer";

const AgentEventRenderer = forwardRef<HTMLDivElement, AgentEventRendererProps>(
  (
    { className, event, isStreaming, defaultExpanded, onToolClick, ...props },
    ref
  ) => {
    const renderEvent = () => {
      switch (event.type) {
        case "thinking":
          return <ThinkingRenderer event={event} isActive={isStreaming} />;
        case "status":
          return <StatusRenderer event={event} />;
        case "tool_call":
          return (
            <ToolCallRenderer
              defaultExpanded={defaultExpanded}
              event={event}
              onClick={() => onToolClick?.(event.toolCallId)}
            />
          );
        case "tool_result":
          return null;
        case "text":
          return <TextRenderer event={event} isStreaming={isStreaming} />;
        case "error":
          return <ErrorRenderer event={event} />;
        case "done":
          return <DoneRenderer event={event} />;
        default:
          return null;
      }
    };

    const content = renderEvent();
    if (!content) {
      return null;
    }

    return (
      <div className={cn("w-full", className)} ref={ref} {...props}>
        {content}
      </div>
    );
  }
);
AgentEventRenderer.displayName = "AgentEventRenderer";

export { AgentEventRenderer };
export type {
  AgentEvent,
  AgentEventRendererProps,
  AgentEventType,
  DoneEvent,
  ErrorEvent,
  StatusEvent,
  TextEvent,
  ThinkingEvent,
  ToolCallEvent,
  ToolResultEvent,
};
