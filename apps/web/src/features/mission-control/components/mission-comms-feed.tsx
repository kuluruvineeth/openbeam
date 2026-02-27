"use client";

import type { AgentMessageItem } from "@openplane/types/mission-control";
import { Icons, ScrollArea } from "@openplane/ui";
import { cva } from "class-variance-authority";
import { useCallback, useMemo, useState } from "react";
import { useNow } from "@/lib/hooks/use-now";
import { useMessages } from "../stores/mission-runtime-store";

const messageBubbleVariants = cva("rounded-sm border px-2.5 py-1.5 text-xs", {
  variants: {
    channel: {
      direct: "border-border/40 bg-muted/20",
      broadcast: "border-primary/20 bg-primary/[0.03]",
      cross_mission: "border-amber-500/20 bg-amber-500/[0.03]",
    },
    isReply: {
      true: "ml-6 border-l-2 border-l-border/60",
      false: "",
    },
  },
  defaultVariants: { channel: "direct", isReply: false },
});

type MissionCommsFeedProps = {
  missionId: string;
};

type MessageRowProps = {
  message: AgentMessageItem;
  onFilterByAgent: (agentName: string) => void;
};

function formatMessageTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function MessageRow({ message, onFilterByAgent }: MessageRowProps) {
  const isReply = Boolean(message.replyToMessageId);
  const isBroadcast = message.channel === "broadcast";
  const isCrossMission = message.channel === "cross_mission";

  return (
    <div
      className={messageBubbleVariants({
        channel: message.channel,
        isReply,
      })}
    >
      <div className="flex items-center gap-1.5">
        <button
          className="font-medium text-[11px] text-foreground transition-colors hover:text-primary"
          onClick={() => onFilterByAgent(message.fromAgentName)}
          type="button"
        >
          {message.fromAgentName}
        </button>
        {message.toAgentName && !isBroadcast && (
          <>
            <Icons.ArrowRight className="text-muted-foreground/50" size={10} />
            <button
              className="font-medium text-[11px] text-foreground transition-colors hover:text-primary"
              onClick={() =>
                message.toAgentName && onFilterByAgent(message.toAgentName)
              }
              type="button"
            >
              {message.toAgentName}
            </button>
          </>
        )}
        {isBroadcast && (
          <span className="rounded-sm border border-primary/20 bg-primary/10 px-1 py-0.5 text-[10px] text-primary">
            Broadcast
          </span>
        )}
        {isCrossMission && message.sourceMissionName && (
          <span className="rounded-sm border border-amber-500/20 bg-amber-500/10 px-1 py-0.5 text-[10px] text-amber-600 dark:text-amber-400">
            {message.sourceMissionName}
          </span>
        )}
        <time className="ml-auto text-[10px] text-muted-foreground tabular-nums">
          {formatMessageTimestamp(message.timestamp)}
        </time>
      </div>
      <p className="mt-1 text-muted-foreground leading-relaxed">
        {message.contentPreview}
      </p>
    </div>
  );
}

export function MissionCommsFeed({ missionId }: MissionCommsFeedProps) {
  const messages = useMessages(missionId);
  const [filterAgent, setFilterAgent] = useState<string | null>(null);
  const now = useNow(5000);

  const filteredMessages = useMemo(
    () =>
      filterAgent
        ? messages.filter(
            (message) =>
              message.fromAgentName === filterAgent ||
              message.toAgentName === filterAgent
          )
        : messages,
    [messages, filterAgent]
  );

  const handleFilterByAgent = useCallback((agentName: string) => {
    setFilterAgent((previous) => (previous === agentName ? null : agentName));
  }, []);

  const hasLiveFlow =
    messages.length > 0 && now - (messages.at(-1)?.timestamp ?? 0) < 30_000;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-border/50 border-b px-3 py-2 dark:border-border/30">
        <Icons.MessageSquare className="text-muted-foreground" size={14} />
        <span className="font-medium text-xs">Comms</span>
        <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground tabular-nums">
          {messages.length}
        </span>
        {hasLiveFlow && (
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
              Active
            </span>
          </span>
        )}
        {filterAgent && (
          <button
            className="ml-auto inline-flex items-center gap-1 rounded-sm border border-border/60 px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            onClick={() => setFilterAgent(null)}
            type="button"
          >
            <Icons.Close size={10} />
            {filterAgent}
          </button>
        )}
      </div>

      <ScrollArea className="flex-1">
        {filteredMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <Icons.MessageSquare
              className="mb-2 text-muted-foreground/40"
              size={24}
            />
            <span className="text-sm">No agent communication yet</span>
          </div>
        )}

        {filteredMessages.length > 0 && (
          <div className="flex flex-col gap-1.5 p-2">
            {filteredMessages.map((message) => (
              <MessageRow
                key={message.messageId}
                message={message}
                onFilterByAgent={handleFilterByAgent}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
