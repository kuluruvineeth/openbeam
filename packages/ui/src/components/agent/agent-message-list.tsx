"use client";

import { forwardRef, useCallback, useImperativeHandle } from "react";
import { useAutoScroll } from "../../hooks/use-auto-scroll";
import type { AgentEvent } from "../../hooks/use-event-grouping";
import { cn } from "../../utils/cn";
import { ScrollArea } from "../scroll-area";
import { AgentMessage } from "./agent-message";
import { TypingIndicator } from "./typing-indicator";

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
  onCopyMessage?: (content: string) => void;
  onRetryMessage?: (messageId: string) => void;
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
      onCopyMessage,
      onRetryMessage,
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

    const handleCopy = useCallback(
      (content: string) => {
        if (onCopyMessage) {
          onCopyMessage(content);
        } else {
          navigator.clipboard.writeText(content);
        }
      },
      [onCopyMessage]
    );

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

    const lastMessage = messages.at(-1);
    const showTypingIndicator =
      isStreaming &&
      lastMessage?.role === "assistant" &&
      lastMessage.events.length === 0;

    return (
      <ScrollArea
        className={cn("flex-1", className)}
        hideScrollbar
        ref={containerRef as React.RefObject<HTMLDivElement>}
      >
        <div className="py-2">
          {messages.map((message, index) => (
            <AgentMessage
              events={message.events}
              id={message.id}
              isStreaming={isStreaming && index === messages.length - 1}
              key={message.id}
              onCopy={handleCopy}
              onRetry={
                onRetryMessage ? () => onRetryMessage(message.id) : undefined
              }
              onToolClick={(toolCallId) =>
                onToolClick?.(message.id, toolCallId)
              }
              role={message.role}
              status={message.status}
            />
          ))}
          {showTypingIndicator && (
            <div className="px-4 py-3">
              <TypingIndicator />
            </div>
          )}
        </div>
      </ScrollArea>
    );
  }
);
AgentMessageList.displayName = "AgentMessageList";

export { AgentMessageList };
export type { AgentMessageListProps, AgentMessageListRef, MessageData };
