"use client";

import { cn, Icons } from "@openbeam/ui";
import { useEffect, useRef } from "react";
import {
  type CommandCenterItem,
  useCommandCenter,
} from "../hooks/use-command-center";
import { formatShortcut, type ShortcutKey } from "../lib/format-shortcut";
import { shortenPath } from "../lib/shorten-path";
import { AgentStatusDot } from "./agent-status-dot";

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) {
    return "just now";
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function ActionIcon({ icon }: { icon?: "plus" | "settings" }) {
  if (icon === "plus") {
    return <Icons.Plus className="size-4" />;
  }
  if (icon === "settings") {
    return <Icons.Settings className="size-4" />;
  }
  return null;
}

function ShortcutBadge({ keys }: { keys: ShortcutKey[] }) {
  return (
    <span className="text-[10px] text-muted-foreground/70">
      {formatShortcut(keys)}
    </span>
  );
}

function CommandCenterItemRow({
  item,
  isActive,
  onSelect,
  onMouseEnter,
}: {
  item: CommandCenterItem;
  isActive: boolean;
  onSelect: (item: CommandCenterItem) => void;
  onMouseEnter: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isActive) {
      ref.current?.scrollIntoView({ block: "nearest" });
    }
  }, [isActive]);

  if (item.kind === "action") {
    return (
      <button
        className={cn(
          "flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-left text-sm",
          isActive ? "bg-accent text-accent-foreground" : "text-foreground"
        )}
        onClick={() => onSelect(item)}
        onMouseEnter={onMouseEnter}
        ref={ref}
        type="button"
      >
        <span className="flex size-5 items-center justify-center text-muted-foreground">
          <ActionIcon icon={item.action.icon} />
        </span>
        <span className="flex-1 truncate">{item.action.title}</span>
        {item.action.shortcutKeys && (
          <ShortcutBadge keys={item.action.shortcutKeys} />
        )}
      </button>
    );
  }

  const agent = item.agent;
  const title = agent.title ?? "New agent";
  const path = shortenPath(agent.cwd);

  return (
    <button
      className={cn(
        "flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-left text-sm",
        isActive ? "bg-accent text-accent-foreground" : "text-foreground"
      )}
      onClick={() => onSelect(item)}
      onMouseEnter={onMouseEnter}
      ref={ref}
      type="button"
    >
      <span className="flex size-5 items-center justify-center">
        <AgentStatusDot
          requiresAttention={agent.requiresAttention}
          showInactive
          status={agent.status}
        />
      </span>
      <span className="flex flex-1 flex-col gap-0.5 overflow-hidden">
        <span className="truncate">{title}</span>
        <span className="truncate text-muted-foreground text-xs">{path}</span>
      </span>
      <span className="shrink-0 text-muted-foreground/70 text-xs">
        {agent.lastActivityAt ? formatTimeAgo(agent.lastActivityAt) : ""}
      </span>
    </button>
  );
}

export function CommandCenter() {
  const {
    open,
    inputRef,
    query,
    setQuery,
    activeIndex,
    setActiveIndex,
    items,
    handleClose,
    handleSelectItem,
  } = useCommandCenter();

  if (!open) {
    return null;
  }

  const actionItems = items.filter((i) => i.kind === "action");
  const agentItems = items.filter((i) => i.kind === "agent");

  let runningIndex = 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <button
        aria-label="Close command center"
        className="fixed inset-0 bg-background/60 backdrop-blur-sm"
        onClick={handleClose}
        type="button"
      />
      <div className="relative w-full max-w-md overflow-hidden rounded-md border border-border/60 bg-popover shadow-lg">
        <div className="flex items-center gap-2 border-border/40 border-b px-3">
          <Icons.Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            className="h-10 flex-1 bg-transparent text-foreground text-sm outline-none placeholder:text-muted-foreground/60"
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search agents and actions..."
            ref={inputRef}
            type="text"
            value={query}
          />
        </div>

        <div className="max-h-72 overflow-y-auto p-1">
          {items.length === 0 && (
            <div className="px-3 py-6 text-center text-muted-foreground text-sm">
              No results found
            </div>
          )}

          {actionItems.length > 0 && (
            <div>
              <div className="px-2.5 pt-2 pb-1 font-medium text-[10px] text-muted-foreground/60 uppercase tracking-wider">
                Actions
              </div>
              {actionItems.map((item) => {
                const idx = runningIndex;
                runningIndex += 1;
                return (
                  <CommandCenterItemRow
                    isActive={idx === activeIndex}
                    item={item}
                    key={item.kind === "action" ? item.action.id : ""}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onSelect={handleSelectItem}
                  />
                );
              })}
            </div>
          )}

          {agentItems.length > 0 && (
            <div>
              <div className="px-2.5 pt-2 pb-1 font-medium text-[10px] text-muted-foreground/60 uppercase tracking-wider">
                Agents
              </div>
              {agentItems.map((item) => {
                const idx = runningIndex;
                runningIndex += 1;
                return (
                  <CommandCenterItemRow
                    isActive={idx === activeIndex}
                    item={item}
                    key={
                      item.kind === "agent"
                        ? `${item.agent.serverId}:${item.agent.id}`
                        : ""
                    }
                    onMouseEnter={() => setActiveIndex(idx)}
                    onSelect={handleSelectItem}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
