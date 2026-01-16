"use client";

import { forwardRef, useImperativeHandle } from "react";
import { useAutoScroll } from "../../hooks/use-auto-scroll";
import type { AgentEvent } from "../../hooks/use-event-grouping";
import { cn } from "../../utils/cn";
import { ScrollArea } from "../scroll-area";
import { AgentMessage } from "./agent-message";

type ChatStatus = "idle" | "streaming" | "complete" | "error";

interface MessageData {
  id: string;
  role: "user" | "assistant";
  events: AgentEvent[];
  status?: ChatStatus;
  createdAt: number;
}

type AgentMessageListProps = React.ComponentProps<"div"> & {
  messages: MessageData[];
  isStreaming?: boolean;
  onToolClick?: (messageId: string, toolCallId: string) => void;
  autoScrollEnabled?: boolean;
  scrollThreshold?: number;
};

interface AgentMessageListRef {
  scrollToBottom: () => void;
  scrollToMessage: (messageId: string) => void;
}

const AgentMessageList = forwardRef<AgentMessageListRef, AgentMessageListProps>(
  (
    {
      className,
      messages,
      isStreaming,
      onToolClick,
      autoScrollEnabled = true,
      scrollThreshold,
      ...props
    },
    ref
  ) => {
    const { containerRef, scrollToBottom } = useAutoScroll({
      isActive: autoScrollEnabled && Boolean(isStreaming),
      threshold: scrollThreshold,
    });

    useImperativeHandle(ref, () => ({
      scrollToBottom,
      scrollToMessage: (messageId: string) => {
        const element = containerRef.current?.querySelector(
          `[data-message-id="${messageId}"]`
        );
        element?.scrollIntoView({ behavior: "smooth", block: "start" });
      },
    }));

    if (messages.length === 0) {
      return (
        <div
          className={cn(
            "flex flex-1 items-center justify-center text-muted-foreground",
            className
          )}
          {...props}
        >
          <p className="text-sm">No messages yet</p>
        </div>
      );
    }

    return (
      <ScrollArea
        className={cn("flex-1", className)}
        ref={containerRef as React.RefObject<HTMLDivElement>}
      >
        <div className="divide-y divide-border/50">
          {messages.map((message, index) => (
            <AgentMessage
              events={message.events}
              id={message.id}
              isStreaming={isStreaming && index === messages.length - 1}
              key={message.id}
              onToolClick={(toolCallId) =>
                onToolClick?.(message.id, toolCallId)
              }
              role={message.role}
              status={message.status}
            />
          ))}
        </div>
      </ScrollArea>
    );
  }
);
AgentMessageList.displayName = "AgentMessageList";

export { AgentMessageList };
export type { AgentMessageListProps, AgentMessageListRef, MessageData };
