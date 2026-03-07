"use client";

import { cn, Icons } from "@openbeam/ui";
import { Button } from "@openbeam/ui/components/button";
import { useCallback, useEffect, useRef } from "react";
import { MAX_CONTENT_WIDTH } from "../constants";
import type { StreamItem, TaskEntry } from "../types";
import { ToolCallDisplay } from "./tool-call-display";

const TIGHT_GAP = "gap-1";
const LOOSE_GAP = "gap-4";

function isToolSequenceItem(item: StreamItem): boolean {
  return (
    item.kind === "tool_call" ||
    item.kind === "thought" ||
    item.kind === "todo_list"
  );
}

function UserMessageBubble({ text }: { text: string }) {
  return (
    <div className="rounded-md bg-muted/50 px-3 py-2 text-foreground text-sm">
      {text}
    </div>
  );
}

function AssistantMessageBlock({ text }: { text: string }) {
  return (
    <div className="whitespace-pre-wrap px-1 text-foreground text-sm leading-relaxed">
      {text}
    </div>
  );
}

function ThoughtBlock({
  text,
  isLoading,
}: {
  text: string;
  isLoading: boolean;
}) {
  return (
    <div className="flex items-start gap-2 rounded-sm border border-border/20 px-3 py-1.5 text-muted-foreground text-xs">
      {isLoading ? (
        <Icons.Loader2 className="mt-px size-3 shrink-0 animate-spin" />
      ) : (
        <Icons.Lightbulb className="mt-px size-3 shrink-0 opacity-50" />
      )}
      <span className="line-clamp-3 italic">{text}</span>
    </div>
  );
}

function TodoListBlock({ items }: { items: TaskEntry[] }) {
  return (
    <div className="space-y-1 rounded-sm border border-border/30 px-3 py-2">
      {items.map((entry, i) => (
        <div className="flex items-center gap-2 text-xs" key={i}>
          {entry.completed && (
            <Icons.Check className="size-3 text-emerald-500" />
          )}
          {!entry.completed && entry.status === "in_progress" && (
            <Icons.Loader2 className="size-3 animate-spin text-blue-500" />
          )}
          {!entry.completed && entry.status !== "in_progress" && (
            <span className="size-3 rounded-sm border border-border/50" />
          )}
          <span
            className={cn(
              "text-muted-foreground",
              entry.completed && "line-through opacity-60"
            )}
          >
            {entry.text}
          </span>
        </div>
      ))}
    </div>
  );
}

function ActivityLogBlock({
  message,
  activityType,
}: {
  message: string;
  activityType: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-[11px]",
        activityType === "error" && "text-destructive/80",
        activityType === "success" && "text-emerald-600 dark:text-emerald-400",
        activityType !== "error" &&
          activityType !== "success" &&
          "text-muted-foreground/60"
      )}
    >
      {activityType === "error" && (
        <Icons.AlertCircle className="size-3 shrink-0" />
      )}
      {activityType === "success" && (
        <Icons.Check className="size-3 shrink-0" />
      )}
      <span>{message}</span>
    </div>
  );
}

function CompactionBlock({
  status,
  preTokens,
}: {
  status: "loading" | "completed";
  preTokens?: number;
}) {
  return (
    <div className="flex items-center justify-center gap-2 border-border/30 border-y border-dashed py-2 text-[11px] text-muted-foreground/50">
      {status === "loading" ? (
        <Icons.Loader2 className="size-3 animate-spin" />
      ) : (
        <Icons.Scissors className="size-3" />
      )}
      <span>
        {status === "loading"
          ? "Compacting context..."
          : `Context compacted${preTokens ? ` (${preTokens.toLocaleString()} tokens)` : ""}`}
      </span>
    </div>
  );
}

function WorkingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1 py-2">
      <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground/40" />
      <span
        className="size-1.5 animate-pulse rounded-full bg-muted-foreground/40"
        style={{ animationDelay: "150ms" }}
      />
      <span
        className="size-1.5 animate-pulse rounded-full bg-muted-foreground/40"
        style={{ animationDelay: "300ms" }}
      />
    </div>
  );
}

function StreamItemBlock({ item, cwd }: { item: StreamItem; cwd?: string }) {
  switch (item.kind) {
    case "user_message":
      return <UserMessageBubble text={item.text} />;

    case "assistant_message":
      return <AssistantMessageBlock text={item.text} />;

    case "thought":
      return (
        <ThoughtBlock isLoading={item.status === "loading"} text={item.text} />
      );

    case "tool_call":
      return <ToolCallDisplay cwd={cwd} item={item} />;

    case "todo_list":
      return (
        <TodoListBlock
          items={item.items.map((t) => ({
            text: t.text,
            status: t.completed ? "completed" : "pending",
            completed: t.completed,
          }))}
        />
      );

    case "activity_log":
      return (
        <ActivityLogBlock
          activityType={item.activityType}
          message={item.message}
        />
      );

    case "compaction":
      return (
        <CompactionBlock preTokens={item.preTokens} status={item.status} />
      );

    default:
      return null;
  }
}

function resolveGap(current: StreamItem, next: StreamItem | undefined): string {
  if (!next) {
    return "";
  }
  if (current.kind === next.kind) {
    return TIGHT_GAP;
  }
  if (isToolSequenceItem(current) && isToolSequenceItem(next)) {
    return TIGHT_GAP;
  }
  return LOOSE_GAP;
}

export function AgentTimeline({
  items,
  cwd,
  isRunning = false,
  hasOlderItems = false,
  onLoadOlder,
  isLoadingOlder = false,
  className,
}: {
  items: StreamItem[];
  cwd?: string;
  isRunning?: boolean;
  hasOlderItems?: boolean;
  onLoadOlder?: () => void;
  isLoadingOlder?: boolean;
  className?: string;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wasAtBottomRef = useRef(true);
  const prevItemCountRef = useRef(items.length);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }
    const threshold = 60;
    wasAtBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  }, []);

  useEffect(() => {
    if (items.length > prevItemCountRef.current && wasAtBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevItemCountRef.current = items.length;
  }, [items.length]);

  return (
    <div
      className={cn("flex flex-1 flex-col overflow-y-auto", className)}
      onScroll={handleScroll}
      ref={containerRef}
    >
      <div
        className="mx-auto flex w-full flex-1 flex-col px-4 py-4"
        style={{ maxWidth: MAX_CONTENT_WIDTH }}
      >
        {hasOlderItems && (
          <div className="mb-4 flex justify-center">
            <Button
              className="text-muted-foreground text-xs"
              disabled={isLoadingOlder}
              onClick={onLoadOlder}
              size="sm"
              variant="ghost"
            >
              {isLoadingOlder ? (
                <Icons.Loader2 className="mr-1.5 size-3 animate-spin" />
              ) : (
                <Icons.ChevronUp className="mr-1.5 size-3" />
              )}
              Load older messages
            </Button>
          </div>
        )}

        {items.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-muted-foreground text-sm">
            No messages yet. Send a prompt to get started.
          </div>
        ) : (
          <div className="flex flex-col">
            {items.map((item, index) => {
              const gap = resolveGap(item, items[index + 1]);
              return (
                <div className={gap} key={item.id}>
                  <StreamItemBlock cwd={cwd} item={item} />
                </div>
              );
            })}
          </div>
        )}

        {isRunning && <WorkingIndicator />}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
