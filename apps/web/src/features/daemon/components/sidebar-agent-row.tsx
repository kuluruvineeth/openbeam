"use client";

import { cn, Icons } from "@openplane/ui";
import { useCallback, useState } from "react";
import type { SidebarAgentListEntry } from "../hooks/use-sidebar-agents-list";
import { shortenPath } from "../lib/shorten-path";
import { useKeyboardShortcutsStore } from "../stores/keyboard-shortcuts-store";
import { AgentStatusDot } from "./agent-status-dot";

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) {
    return "now";
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

function resolveBranchLabel(entry: SidebarAgentListEntry): string | null {
  const checkout = entry.project.checkout;
  if (!checkout.isGit) {
    return null;
  }
  const branch = checkout.currentBranch;
  if (
    !branch ||
    branch === "HEAD" ||
    branch === "main" ||
    branch === "master"
  ) {
    return null;
  }
  return branch;
}

export function SidebarAgentRow({
  entry,
  isSelected,
  shortcutNumber,
  onSelect,
  onArchive,
}: {
  entry: SidebarAgentListEntry;
  isSelected: boolean;
  shortcutNumber: number | null;
  onSelect: (entry: SidebarAgentListEntry) => void;
  onArchive?: (entry: SidebarAgentListEntry) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isArchiveConfirmVisible, setIsArchiveConfirmVisible] = useState(false);
  const altDown = useKeyboardShortcutsStore((s) => s.altDown);

  const agent = entry.agent;
  const title = agent.title ?? "New agent";
  const branchLabel = resolveBranchLabel(entry);
  const showShortcut = altDown && shortcutNumber !== null;
  const showArchive = isHovered && !showShortcut && !isArchiveConfirmVisible;
  const showArchiveConfirm = isArchiveConfirmVisible;

  const handleArchiveClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isArchiveConfirmVisible) {
        setIsArchiveConfirmVisible(false);
        onArchive?.(entry);
      } else {
        setIsArchiveConfirmVisible(true);
      }
    },
    [entry, isArchiveConfirmVisible, onArchive]
  );

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setIsArchiveConfirmVisible(false);
  }, []);

  return (
    <button
      className={cn(
        "group flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors",
        isSelected
          ? "bg-accent text-accent-foreground"
          : "text-foreground hover:bg-accent/50"
      )}
      onClick={() => onSelect(entry)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      type="button"
    >
      <span className="mt-1 flex size-4 shrink-0 items-center justify-center">
        {showShortcut ? (
          <span className="font-medium text-[10px] text-muted-foreground">
            {shortcutNumber}
          </span>
        ) : (
          <AgentStatusDot
            requiresAttention={agent.requiresAttention}
            showInactive
            status={agent.status}
          />
        )}
      </span>

      <span className="flex flex-1 flex-col gap-0.5 overflow-hidden">
        <span className="truncate font-medium">{title}</span>
        <span className="flex items-center gap-1 truncate text-muted-foreground text-xs">
          <span className="truncate">
            {shortenPath(entry.project.checkout.cwd)}
          </span>
          {branchLabel && (
            <>
              <span className="text-border">·</span>
              <span className="shrink-0 truncate">{branchLabel}</span>
            </>
          )}
        </span>
      </span>

      <span className="mt-0.5 flex shrink-0 items-center">
        {showArchive && (
          <button
            className="rounded p-0.5 text-muted-foreground hover:text-foreground"
            onClick={handleArchiveClick}
            type="button"
          >
            <Icons.Trash className="size-3.5" />
          </button>
        )}
        {showArchiveConfirm && (
          <button
            className="rounded p-0.5 text-emerald-500 hover:text-emerald-400"
            onClick={handleArchiveClick}
            type="button"
          >
            <Icons.Check className="size-3.5" />
          </button>
        )}
        {!(showArchive || showArchiveConfirm || showShortcut) && (
          <span className="text-muted-foreground/60 text-xs">
            {agent.lastActivityAt ? formatTimeAgo(agent.lastActivityAt) : ""}
          </span>
        )}
      </span>
    </button>
  );
}
