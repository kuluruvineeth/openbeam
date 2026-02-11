"use client";

import type { MissionApprovalQueueItem } from "@openplane/types/mission-control";
import { Icons } from "@openplane/ui";
import { useCallback, useMemo, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { ApprovalBulkActionBar } from "./approval-bulk-action-bar";
import { ApprovalDetailPanel } from "./approval-detail-panel";
import { ApprovalListItem } from "./approval-list-item";

const RISK_PRIORITY: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

type MissionApprovalDrawerProps = {
  approvals: MissionApprovalQueueItem[];
  selectedIds: Set<string>;
  onApprove: (approvalId: string) => void;
  onReject: (approvalId: string, reason?: string) => void;
  onToggleSelect: (approvalId: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
};

export function MissionApprovalDrawer({
  approvals,
  selectedIds,
  onApprove,
  onReject,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
}: MissionApprovalDrawerProps) {
  const [focusedIndex, setFocusedIndex] = useState(0);

  const pendingApprovals = useMemo(
    () =>
      approvals
        .filter((a) => a.status === "pending")
        .sort((a, b) => {
          const riskDiff =
            (RISK_PRIORITY[a.riskLevel] ?? 4) -
            (RISK_PRIORITY[b.riskLevel] ?? 4);
          if (riskDiff !== 0) {
            return riskDiff;
          }
          return a.requestedAt - b.requestedAt;
        }),
    [approvals]
  );

  const focusedApproval = pendingApprovals[focusedIndex] ?? null;

  const navigateDown = useCallback(() => {
    setFocusedIndex((i) => Math.min(i + 1, pendingApprovals.length - 1));
  }, [pendingApprovals.length]);

  const navigateUp = useCallback(() => {
    setFocusedIndex((i) => Math.max(i - 1, 0));
  }, []);

  const approveCurrentCallback = useCallback(() => {
    if (focusedApproval) {
      onApprove(focusedApproval.approvalId);
    }
  }, [focusedApproval, onApprove]);

  const rejectCurrentCallback = useCallback(() => {
    if (focusedApproval) {
      onReject(focusedApproval.approvalId);
    }
  }, [focusedApproval, onReject]);

  const toggleBulkCurrentCallback = useCallback(() => {
    if (focusedApproval) {
      onToggleSelect(focusedApproval.approvalId);
    }
  }, [focusedApproval, onToggleSelect]);

  const bulkApproveCallback = useCallback(() => {
    for (const id of selectedIds) {
      onApprove(id);
    }
    onClearSelection();
  }, [selectedIds, onApprove, onClearSelection]);

  const bulkRejectCallback = useCallback(() => {
    for (const id of selectedIds) {
      onReject(id);
    }
    onClearSelection();
  }, [selectedIds, onReject, onClearSelection]);

  useHotkeys("j, down", navigateDown, { preventDefault: true });
  useHotkeys("k, up", navigateUp, { preventDefault: true });
  useHotkeys("a", approveCurrentCallback, { preventDefault: true });
  useHotkeys("r", rejectCurrentCallback, { preventDefault: true });
  useHotkeys("x", toggleBulkCurrentCallback, { preventDefault: true });
  useHotkeys("mod+a", onSelectAll, { preventDefault: true });
  useHotkeys("escape", onClearSelection, { preventDefault: true });

  if (pendingApprovals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Icons.CheckCircle2 className="mb-2 opacity-50" size={24} />
        <span className="text-sm">No pending approvals</span>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0">
      <div className="flex w-[40%] min-w-0 flex-col border-border/50 border-r">
        <div className="flex items-center justify-between border-border/50 border-b px-3 py-2">
          <span className="font-medium text-sm">
            {pendingApprovals.length} pending
          </span>
          <div className="flex items-center gap-1 text-muted-foreground text-xs">
            <kbd className="rounded border border-border/50 px-1 font-mono text-[10px]">
              j
            </kbd>
            <kbd className="rounded border border-border/50 px-1 font-mono text-[10px]">
              k
            </kbd>
            navigate
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {pendingApprovals.map((approval, index) => (
            <ApprovalListItem
              approval={approval}
              isBulkSelected={selectedIds.has(approval.approvalId)}
              isSelected={index === focusedIndex}
              key={approval.approvalId}
              onSelect={() => setFocusedIndex(index)}
              onToggleBulk={() => onToggleSelect(approval.approvalId)}
            />
          ))}
        </div>
      </div>

      <div className="flex w-[60%] min-w-0 flex-col">
        <ApprovalDetailPanel
          approval={focusedApproval}
          onApprove={onApprove}
          onReject={onReject}
        />
      </div>

      <ApprovalBulkActionBar
        onApproveAll={bulkApproveCallback}
        onClear={onClearSelection}
        onRejectAll={bulkRejectCallback}
        selectedCount={selectedIds.size}
      />
    </div>
  );
}
