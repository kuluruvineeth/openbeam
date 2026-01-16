"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Bot, User } from "lucide-react";
import { forwardRef } from "react";
import {
  type AgentEvent,
  useEventGrouping,
} from "../../hooks/use-event-grouping";
import { cn } from "../../utils/cn";
import { AgentEventRenderer } from "./agent-event-renderer";
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

const agentMessageVariants = cva("flex gap-3 px-4 py-3", {
  variants: {
    role: {
      user: "bg-muted/30",
      assistant: "bg-background",
    },
  },
  defaultVariants: {
    role: "assistant",
  },
});

type AgentMessageRole = "user" | "assistant";

type AgentMessageProps = React.ComponentProps<"div"> &
  VariantProps<typeof agentMessageVariants> & {
    id: string;
    role: AgentMessageRole;
    events: AgentEvent[];
    status?: ChatStatus;
    isStreaming?: boolean;
    onToolClick?: (toolCallId: string) => void;
  };

function isToolCallEvent(event: AgentEvent): event is ToolCallEvent {
  return event.type === "tool_call";
}

function isToolResultEvent(event: AgentEvent): event is ToolResultEvent {
  return event.type === "tool_result";
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
      ...props
    },
    ref
  ) => {
    const { groupedItems } = useEventGrouping(events);

    const renderAvatar = () => {
      if (role === "user") {
        return (
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
            <User className="size-4 text-muted-foreground" />
          </div>
        );
      }
      return (
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Bot className="size-4 text-primary" />
        </div>
      );
    };

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

      return (
        <AgentEventRenderer
          event={item.event}
          isStreaming={isStreaming && index === groupedItems.length - 1}
          key={`event-${index}`}
          onToolClick={onToolClick}
        />
      );
    };

    return (
      <div
        className={cn(agentMessageVariants({ role }), className)}
        data-message-id={id}
        data-message-role={role}
        ref={ref}
        {...props}
      >
        {renderAvatar()}
        <div className="min-w-0 flex-1 space-y-3">
          {groupedItems.map((item, index) => renderGroupedItem(item, index))}
        </div>
      </div>
    );
  }
);
AgentMessage.displayName = "AgentMessage";

export { AgentMessage, agentMessageVariants };
export type { AgentMessageProps, AgentMessageRole };
