"use client";

import { AgentMarkdown, Icons, Markdown, ScrollArea } from "@openplane/ui";
import { cva } from "class-variance-authority";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useRef } from "react";
import { useNow } from "@/lib/hooks/use-now";
import { cn } from "@/lib/utils";
import {
  type ChatCommsItem,
  type ChatMessage,
  type ChatReflectionItem,
  type ChatStatusLine,
  createChatProjectionCache,
} from "../../lib/chat-projection";
import { formatTimelineTimestamp } from "../../lib/time-display";
import {
  useAgentNameMap,
  useAllReflections,
  useMessages,
  useMissionEvents,
} from "../../stores/mission-runtime-store";

const statusLineVariants = cva(
  "flex items-center justify-center gap-2 px-4 py-1.5 text-[11px] text-muted-foreground",
  {
    variants: {
      kind: {
        join: "",
        complete: "",
        error: "text-destructive/80",
        delegation: "",
        replan: "",
        spawn: "",
        escalation: "text-amber-600/80 dark:text-amber-400/80",
      },
    },
    defaultVariants: { kind: "join" },
  }
);

const commsChannelVariants = cva("text-[11px]", {
  variants: {
    channel: {
      direct: "text-muted-foreground",
      broadcast: "text-amber-600/80 dark:text-amber-400/80",
      cross_mission: "text-violet-600/80 dark:text-violet-400/80",
    },
  },
  defaultVariants: { channel: "direct" },
});

const reflectionScoreVariants = cva(
  "rounded-sm px-1 py-px font-mono text-[10px] tabular-nums",
  {
    variants: {
      sentiment: {
        positive: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        neutral: "bg-muted text-muted-foreground",
        warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
        replan: "bg-destructive/10 text-destructive",
      },
    },
    defaultVariants: { sentiment: "neutral" },
  }
);

const STATUS_KIND_ICONS: Record<ChatStatusLine["kind"], React.ReactNode> = {
  join: <Icons.Play className="text-emerald-500/60" size={10} />,
  complete: <Icons.Check className="text-primary/60" size={10} />,
  error: <Icons.AlertCircle className="text-destructive/60" size={10} />,
  delegation: <Icons.GitBranch className="text-amber-500/60" size={10} />,
  replan: <Icons.RefreshCw className="text-primary/60" size={10} />,
  spawn: <Icons.Plus className="text-violet-500/60" size={10} />,
  escalation: <Icons.AlertCircle className="text-amber-500/60" size={10} />,
};

function ChatMessageBubble({
  message,
  now,
}: {
  message: ChatMessage;
  now: number;
}) {
  const timestamp = formatTimelineTimestamp(message.timestamp, now);

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="px-3 py-2"
      initial={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <div className="mb-1.5 flex items-center gap-2">
        <div className="flex size-5 items-center justify-center rounded-sm bg-muted font-medium text-[10px]">
          {message.agentName.charAt(0).toUpperCase()}
        </div>
        <span className="font-medium text-xs">{message.agentName}</span>
        {message.agentRole && (
          <span className="text-[10px] text-muted-foreground">
            {message.agentRole}
          </span>
        )}
        <time
          className="ml-auto text-[10px] text-muted-foreground tabular-nums"
          dateTime={timestamp.dateTime}
          title={timestamp.secondary}
        >
          {timestamp.primary}
        </time>
      </div>

      <div className="pl-7 [&_p:last-child]:mb-0">
        <Markdown
          content={message.content}
          showControls={false}
          size="sm"
          variant="compact"
        />
      </div>
    </motion.div>
  );
}

function ChatStatusRow({ line, now }: { line: ChatStatusLine; now: number }) {
  const timestamp = formatTimelineTimestamp(line.timestamp, now);

  return (
    <motion.div
      animate={{ opacity: 1 }}
      className={cn(statusLineVariants({ kind: line.kind }))}
      initial={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      {STATUS_KIND_ICONS[line.kind]}
      <span>{line.content}</span>
      <time
        className="text-[10px] tabular-nums"
        dateTime={timestamp.dateTime}
        title={timestamp.secondary}
      >
        {timestamp.primary}
      </time>
    </motion.div>
  );
}

function ChatCommsBroadcast({
  comms,
  now,
}: {
  comms: ChatCommsItem;
  now: number;
}) {
  const timestamp = formatTimelineTimestamp(comms.timestamp, now);

  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="flex flex-col items-center gap-0.5 px-4 py-1.5"
      initial={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <div
        className={cn(
          "flex items-center justify-center gap-2",
          commsChannelVariants({ channel: comms.channel })
        )}
      >
        <Icons.Messages className="text-amber-500/60" size={10} />
        <span className="font-medium">{comms.fromAgentName}</span>
        <span>broadcast</span>
        {comms.sourceMissionName && (
          <span className="rounded-sm bg-violet-500/15 px-1 py-px font-medium text-[9px] text-violet-600 dark:text-violet-400">
            {comms.sourceMissionName}
          </span>
        )}
        <time
          className="text-[10px] tabular-nums"
          dateTime={timestamp.dateTime}
          title={timestamp.secondary}
        >
          {timestamp.primary}
        </time>
      </div>
      <AgentMarkdown
        className="!text-[11px] !text-muted-foreground/80 !space-y-0 max-w-[85%] text-center [&_p]:leading-relaxed"
        content={comms.content}
        size="sm"
      />
    </motion.div>
  );
}

function ChatCommsMessage({
  comms,
  now,
}: {
  comms: ChatCommsItem;
  now: number;
}) {
  const timestamp = formatTimelineTimestamp(comms.timestamp, now);
  const isCrossMission = comms.channel === "cross_mission";

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="px-3 py-2"
      initial={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <div className="mb-1.5 flex items-center gap-2">
        <div className="flex size-5 items-center justify-center rounded-sm bg-muted font-medium text-[10px]">
          {comms.fromAgentName.charAt(0).toUpperCase()}
        </div>
        <span className="font-medium text-xs">{comms.fromAgentName}</span>
        {comms.toAgentName && (
          <>
            <Icons.ArrowRight className="text-muted-foreground/60" size={10} />
            <span className="text-[10px] text-muted-foreground">
              {comms.toAgentName}
            </span>
          </>
        )}
        {isCrossMission && comms.sourceMissionName && (
          <span className="rounded-sm bg-violet-500/15 px-1 py-px font-medium text-[9px] text-violet-600 dark:text-violet-400">
            {comms.sourceMissionName}
          </span>
        )}
        <time
          className="ml-auto text-[10px] text-muted-foreground tabular-nums"
          dateTime={timestamp.dateTime}
          title={timestamp.secondary}
        >
          {timestamp.primary}
        </time>
      </div>
      <AgentMarkdown
        className="!text-[12px] !text-foreground/80 !space-y-0 pl-7 [&_p]:leading-relaxed"
        content={comms.content}
        size="sm"
      />
    </motion.div>
  );
}

function ChatCommsRow({ comms, now }: { comms: ChatCommsItem; now: number }) {
  if (comms.channel === "broadcast") {
    return <ChatCommsBroadcast comms={comms} now={now} />;
  }
  return <ChatCommsMessage comms={comms} now={now} />;
}

function reflectionSentiment(score: number, triggeredReplan: boolean) {
  if (triggeredReplan) {
    return "replan" as const;
  }
  if (score >= 0.7) {
    return "positive" as const;
  }
  if (score >= 0.4) {
    return "neutral" as const;
  }
  return "warning" as const;
}

function ChatReflectionRow({
  reflection,
  now,
}: {
  reflection: ChatReflectionItem;
  now: number;
}) {
  const timestamp = formatTimelineTimestamp(reflection.timestamp, now);
  const sentiment = reflectionSentiment(
    reflection.score,
    reflection.triggeredReplan
  );
  const isNewsworthy = reflection.triggeredReplan || reflection.score < 0.4;

  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="flex flex-col items-center gap-0.5 px-4 py-1.5"
      initial={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
        <Icons.BrainCircuit className="text-muted-foreground/60" size={10} />
        <span>{reflection.agentName} reflected</span>
        <span className={cn(reflectionScoreVariants({ sentiment }))}>
          {reflection.score.toFixed(2)}
        </span>
        {reflection.triggeredReplan && (
          <span className="rounded-sm bg-destructive/15 px-1 py-px font-medium text-[9px] text-destructive">
            replan
          </span>
        )}
        <time
          className="text-[10px] tabular-nums"
          dateTime={timestamp.dateTime}
          title={timestamp.secondary}
        >
          {timestamp.primary}
        </time>
      </div>
      {isNewsworthy && reflection.verbalMemory && (
        <span className="max-w-[85%] text-center text-[10px] text-muted-foreground/70">
          {reflection.verbalMemory}
        </span>
      )}
    </motion.div>
  );
}

type AgentChatFeedProps = {
  missionId: string;
  runId: string;
  selectedAgentId: string | null;
};

export function AgentChatFeed({
  missionId,
  runId,
  selectedAgentId,
}: AgentChatFeedProps) {
  const events = useMissionEvents(runId);
  const agentBoard = useAgentNameMap();
  const messages = useMessages(missionId);
  const reflections = useAllReflections();
  const bottomRef = useRef<HTMLDivElement>(null);
  const projectRef = useRef(createChatProjectionCache());
  const now = useNow(60_000);

  const entries = useMemo(
    () =>
      projectRef.current({
        events,
        messages,
        reflections,
        agentFilter: selectedAgentId,
        agentBoard,
      }),
    [events, messages, reflections, selectedAgentId, agentBoard]
  );

  const prevEntryCountRef = useRef(0);
  if (entries.length !== prevEntryCountRef.current) {
    prevEntryCountRef.current = entries.length;
    queueMicrotask(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }

  if (entries.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
        <Icons.MessageSquare
          className="mb-2 text-muted-foreground/40"
          size={24}
        />
        <span className="text-sm">
          {selectedAgentId
            ? "No activity for selected agent"
            : "Waiting for agents to start..."}
        </span>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-0.5 py-2">
        <AnimatePresence initial={false}>
          {entries.map((entry) => {
            switch (entry.type) {
              case "status":
                return (
                  <ChatStatusRow
                    key={entry.data.id}
                    line={entry.data}
                    now={now}
                  />
                );
              case "message":
                return (
                  <ChatMessageBubble
                    key={entry.data.id}
                    message={entry.data}
                    now={now}
                  />
                );
              case "comms":
                return (
                  <ChatCommsRow
                    comms={entry.data}
                    key={entry.data.id}
                    now={now}
                  />
                );
              case "reflection":
                return (
                  <ChatReflectionRow
                    key={entry.data.id}
                    now={now}
                    reflection={entry.data}
                  />
                );
              default:
                return null;
            }
          })}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}

export { statusLineVariants, commsChannelVariants, reflectionScoreVariants };
