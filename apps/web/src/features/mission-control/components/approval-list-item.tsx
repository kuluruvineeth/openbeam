"use client";

import type { MissionApprovalQueueItem } from "@openplane/types/mission-control";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { ApprovalRiskBadge } from "./approval-risk-badge";

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;

function formatRelativeTime(timestamp: number): string {
  const delta = Date.now() - timestamp;
  if (delta < MINUTE_MS) {
    return "just now";
  }
  if (delta < HOUR_MS) {
    return `${Math.floor(delta / MINUTE_MS)}m ago`;
  }
  return `${Math.floor(delta / HOUR_MS)}h ago`;
}

const listItemVariants = cva(
  "flex cursor-pointer items-center gap-3 border-l-2 px-3 py-2.5 transition-colors",
  {
    variants: {
      selected: {
        true: "border-l-primary bg-muted/60",
        false: "border-l-transparent hover:bg-muted/30",
      },
      critical: {
        true: "animate-pulse border-l-red-500/50",
        false: "",
      },
    },
    defaultVariants: {
      selected: false,
      critical: false,
    },
  }
);

type ApprovalListItemProps = {
  approval: MissionApprovalQueueItem;
  isSelected: boolean;
  isBulkSelected: boolean;
  onSelect: () => void;
  onToggleBulk: () => void;
};

export function ApprovalListItem({
  approval,
  isSelected,
  isBulkSelected,
  onSelect,
  onToggleBulk,
}: ApprovalListItemProps) {
  const isCritical = approval.riskLevel === "critical" && !isSelected;

  return (
    <button
      className={cn(
        listItemVariants({
          selected: isSelected,
          critical: isCritical,
        })
      )}
      onClick={onSelect}
      type="button"
    >
      <input
        checked={isBulkSelected}
        className="h-3.5 w-3.5 shrink-0 rounded-sm border border-border/50 accent-primary"
        onChange={(e) => {
          e.stopPropagation();
          onToggleBulk();
        }}
        onClick={(e) => e.stopPropagation()}
        type="checkbox"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-medium text-sm">
            {approval.agentName}
          </span>
          <ApprovalRiskBadge risk={approval.riskLevel} />
        </div>
        <p className="mt-0.5 truncate text-muted-foreground text-xs">
          {approval.actionIntent}
        </p>
      </div>
      <span className="shrink-0 font-mono text-muted-foreground text-xs tabular-nums">
        {formatRelativeTime(approval.requestedAt)}
      </span>
    </button>
  );
}
