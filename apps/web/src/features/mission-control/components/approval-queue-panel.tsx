"use client";

import type { MissionApprovalQueueItem } from "@openplane/types/mission-control";
import { Icons } from "@openplane/ui";
import { useCallback, useMemo, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import {
  useApprovalQueue,
  useMissionRuntimeStore,
  useSelectedApprovalIds,
} from "../stores/mission-runtime-store";
import { ApprovalBulkActionBar } from "./approval-bulk-action-bar";
import { ApprovalDetailPanel } from "./approval-detail-panel";
import { ApprovalListItem } from "./approval-list-item";

type ApprovalQueuePanelProps = {
  onApprove: (id: string) => void;
  onReject: (id: string, reason?: string) => void;
};

export function ApprovalQueuePanel({
  onApprove,
  onReject,
}: ApprovalQueuePanelProps) {
  const approvals = useApprovalQueue();
  const selectedIds = useSelectedApprovalIds();
  const toggleSelection = useMissionRuntimeStore(
    (s) => s.toggleApprovalSelection
  );
  const selectAll = useMissionRuntimeStore((s) => s.selectAllApprovals);
  const clearSelection = useMissionRuntimeStore(
    (s) => s.clearApprovalSelection
  );

  const [activeApprovalId, setActiveApprovalId] = useState<string | null>(null);
  const focusedIndexRef = useRef(0);

  const pendingApprovals = useMemo(
    () => approvals.filter((a) => a.status === "pending"),
    [approvals]
  );

  const activeApproval: MissionApprovalQueueItem | null = useMemo(
    () => approvals.find((a) => a.approvalId === activeApprovalId) ?? null,
    [approvals, activeApprovalId]
  );

  const handleApproveAll = useCallback(() => {
    for (const id of selectedIds) {
      onApprove(id);
    }
    clearSelection();
  }, [selectedIds, onApprove, clearSelection]);

  const handleRejectAll = useCallback(() => {
    for (const id of selectedIds) {
      onReject(id);
    }
    clearSelection();
  }, [selectedIds, onReject, clearSelection]);

  useHotkeys(
    "j",
    () => {
      const next = Math.min(focusedIndexRef.current + 1, approvals.length - 1);
      focusedIndexRef.current = next;
      setActiveApprovalId(approvals[next]?.approvalId ?? null);
    },
    { enabled: approvals.length > 0 }
  );

  useHotkeys(
    "k",
    () => {
      const next = Math.max(focusedIndexRef.current - 1, 0);
      focusedIndexRef.current = next;
      setActiveApprovalId(approvals[next]?.approvalId ?? null);
    },
    { enabled: approvals.length > 0 }
  );

  useHotkeys(
    "a",
    () => {
      if (activeApproval?.status === "pending") {
        onApprove(activeApproval.approvalId);
      }
    },
    { enabled: activeApproval?.status === "pending" }
  );

  useHotkeys(
    "r",
    () => {
      if (activeApproval?.status === "pending") {
        onReject(activeApproval.approvalId);
      }
    },
    { enabled: activeApproval?.status === "pending" }
  );

  useHotkeys("mod+a", (e) => {
    e.preventDefault();
    selectAll();
  });

  if (approvals.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
        <Icons.ShieldAlert className="mb-2 opacity-40" size={20} />
        <span className="text-sm">No approvals</span>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div className="flex w-80 shrink-0 flex-col border-border/50 border-r">
        <div className="flex items-center justify-between border-border/50 border-b px-3 py-2">
          <span className="font-medium text-xs">
            {pendingApprovals.length} pending
          </span>
          <span className="text-[10px] text-muted-foreground">
            j/k navigate &middot; a approve &middot; r reject
          </span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {approvals.map((approval) => (
            <ApprovalListItem
              approval={approval}
              isBulkSelected={selectedIds.has(approval.approvalId)}
              isSelected={approval.approvalId === activeApprovalId}
              key={approval.approvalId}
              onSelect={() => setActiveApprovalId(approval.approvalId)}
              onToggleBulk={() => toggleSelection(approval.approvalId)}
            />
          ))}
        </div>
      </div>

      <div className="flex-1">
        <ApprovalDetailPanel
          approval={activeApproval}
          onApprove={onApprove}
          onReject={onReject}
        />
      </div>

      <ApprovalBulkActionBar
        onApproveAll={handleApproveAll}
        onClear={clearSelection}
        onRejectAll={handleRejectAll}
        selectedCount={selectedIds.size}
      />
    </div>
  );
}
