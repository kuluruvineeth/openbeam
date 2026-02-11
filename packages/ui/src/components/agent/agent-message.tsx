"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";
import {
  type AgentEvent,
  useEventGrouping,
} from "../../hooks/use-event-grouping";
import { cn } from "../../utils/cn";
import { AgentCanvasProgress } from "./agent-canvas-progress";
import { AgentEventRenderer } from "./agent-event-renderer";
import { AgentMessageActions } from "./agent-message-actions";
import type { GroupedTool } from "./agent-tool-group";
import { AgentToolGroup } from "./agent-tool-group";

interface ToolCallEvent {
  type: "tool_call";
  timestamp: number;
  toolCallId: string;
  toolName: string;
  displayName: string;
  toolInput?: unknown;
  visibility: "visible" | "ephemeral" | "hidden";
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

type ChatStatus = "idle" | "streaming" | "complete" | "error";

const agentMessageVariants = cva("group/message", {
  variants: {
    role: {
      user: "flex justify-end px-4 py-2",
      assistant: "px-4 py-3",
    },
  },
  defaultVariants: {
    role: "assistant",
  },
});

type AgentMessageRole = "user" | "assistant";

type AgentMessageProps = Omit<React.ComponentProps<"div">, "onCopy"> &
  VariantProps<typeof agentMessageVariants> & {
    id: string;
    role: AgentMessageRole;
    events: AgentEvent[];
    status?: ChatStatus;
    isStreaming?: boolean;
    onToolClick?: (toolCallId: string) => void;
    onCopy?: (content: string) => void;
    onRetry?: () => void;
  };

function isToolCallEvent(event: AgentEvent): event is ToolCallEvent {
  return event.type === "tool_call";
}

function isToolResultEvent(event: AgentEvent): event is ToolResultEvent {
  return event.type === "tool_result";
}

function extractTextContent(events: AgentEvent[]): string {
  return events
    .filter(
      (e): e is AgentEvent & { type: "text"; content: string } =>
        e.type === "text" &&
        "content" in e &&
        typeof (e as Record<string, unknown>).content === "string"
    )
    .map((e) => e.content)
    .join("");
}

const AgentMessage = forwardRef<HTMLDivElement, AgentMessageProps>(
  (
    {
      className,
      id,
      role,
      events,
      status: _status,
      isStreaming,
      onToolClick,
      onCopy,
      onRetry,
      ...props
    },
    ref
  ) => {
    const { groupedItems } = useEventGrouping(events);

    const renderGroupedItem = (
      item: (typeof groupedItems)[number],
      index: number
    ) => {
      if (item.type === "group") {
        const groupedTools: GroupedTool[] = item.events
          .filter(isToolCallEvent)
          .map((toolCall) => {
            const result = item.events.find(
              (r) =>
                isToolResultEvent(r) && r.toolCallId === toolCall.toolCallId
            ) as ToolResultEvent | undefined;

            let status: GroupedTool["status"] = "pending";
            if (result) {
              status = result.success ? "success" : "error";
            } else {
              status = "running";
            }

            return {
              id: toolCall.toolCallId,
              name: toolCall.displayName,
              status,
              summary: undefined,
            };
          });

        const hasError = groupedTools.some((t) => t.status === "error");
        const allComplete = groupedTools.every(
          (t) => t.status === "success" || t.status === "error"
        );
        const isRunning = groupedTools.some((t) => t.status === "running");

        let groupStatus: "pending" | "running" | "completed" | "error" =
          "pending";
        if (hasError) {
          groupStatus = "error";
        } else if (allComplete) {
          groupStatus = "completed";
        } else if (isRunning) {
          groupStatus = "running";
        }

        return (
          <AgentToolGroup
            key={item.groupId}
            label={item.label}
            status={groupStatus}
            tools={groupedTools}
          />
        );
      }

      if (item.type === "canvas_progress") {
        const statusEvents = item.events.filter(
          (
            e
          ): e is {
            type: "status";
            timestamp: number;
            status: string;
            message: string;
          } => e.type === "status"
        );
        const hasSubsequentContent = groupedItems
          .slice(index + 1)
          .some(
            (g) =>
              g.type === "single" &&
              (g.event.type === "text" || g.event.type === "done")
          );
        return (
          <AgentCanvasProgress
            events={statusEvents}
            isStreaming={!!isStreaming && !hasSubsequentContent}
            key={item.groupId}
          />
        );
      }

      const matchedResult = isToolCallEvent(item.event)
        ? (events.find(
            (e) =>
              isToolResultEvent(e) &&
              e.toolCallId === (item.event as ToolCallEvent).toolCallId
          ) as ToolResultEvent | undefined)
        : undefined;

      return (
        <AgentEventRenderer
          event={item.event}
          isStreaming={isStreaming && index === groupedItems.length - 1}
          key={`event-${index}`}
          onToolClick={onToolClick}
          toolResult={matchedResult}
        />
      );
    };

    if (role === "user") {
      const textContent = extractTextContent(events);
      return (
        <div
          className={cn(agentMessageVariants({ role }), className)}
          data-message-id={id}
          data-message-role={role}
          ref={ref}
          {...props}
        >
          <div className="max-w-[85%] overflow-hidden rounded-2xl bg-muted/60 px-4 py-2.5">
            <p className="whitespace-pre-wrap break-words text-foreground text-sm leading-relaxed">
              {textContent}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div
        className={cn(agentMessageVariants({ role }), className)}
        data-message-id={id}
        data-message-role={role}
        ref={ref}
        {...props}
      >
        <div className="min-w-0 space-y-3 overflow-hidden">
          {groupedItems.map((item, index) => renderGroupedItem(item, index))}
          {!isStreaming && events.some((e) => e.type === "text") && (
            <AgentMessageActions
              onCopy={() => onCopy?.(extractTextContent(events))}
              onRetry={onRetry}
            />
          )}
        </div>
      </div>
    );
  }
);
AgentMessage.displayName = "AgentMessage";

export { AgentMessage, agentMessageVariants };
export type { AgentMessageProps, AgentMessageRole };
