"use client";

import type { ApprovalNodeConfig } from "@openbeam/types/canvas";
import { memo, useMemo } from "react";
import { formatDuration } from "../../../../utils/format";
import {
  ActionsSection,
  ApproversSection,
  MessageSection,
  NotificationsSection,
  StrategySection,
  TimeoutSection,
} from "../../ai-elements/approval-config-sections";
import { NotesList, WarningsList } from "../feedback-lists";

interface ApprovalConfigPanelProps {
  config: ApprovalNodeConfig;
  onChange: (config: Partial<ApprovalNodeConfig>) => void;
}

function buildWarnings(config: ApprovalNodeConfig): string[] {
  const warnings: string[] = [];

  if (!config.message?.trim()) {
    warnings.push("Approval message is required");
  }

  if (config.approvalType !== "single") {
    warnings.push("Only single approvals are supported");
  }

  if ((config.requiredApprovals ?? 1) !== 1) {
    warnings.push("Required approvals must be 1");
  }

  if (
    config.allowedActions?.some(
      (action) => action !== "approve" && action !== "reject"
    )
  ) {
    warnings.push("Only approve/reject actions are supported");
  }

  if (config.timeoutAction === "escalate") {
    warnings.push("Escalation is not supported");
  }

  if (config.autoApprove) {
    warnings.push("Auto-approve is not supported");
  }

  if (config.escalation?.enabled) {
    warnings.push("Escalation rules are not supported");
  }

  if (config.notification) {
    warnings.push("Notifications are not supported");
  }

  return warnings;
}

function buildNotes(config: ApprovalNodeConfig): string[] {
  const notes: string[] = [];

  if ((config.approvers?.length ?? 0) === 0) {
    notes.push("Any team member can approve");
  }

  if (config.timeoutMs && config.timeoutMs > 0) {
    const action = config.timeoutAction ?? "reject";
    if (action === "approve" || action === "reject") {
      notes.push(
        `Timeout after ${formatDuration(config.timeoutMs)} will auto-${action}`
      );
    } else {
      notes.push(`Timeout after ${formatDuration(config.timeoutMs)}`);
    }
  }

  if (config.requireComment) {
    notes.push("Comments are required for approval responses");
  }

  if (config.customLabels?.approve || config.customLabels?.reject) {
    notes.push("Custom action labels are set");
  }

  return notes;
}

export const ApprovalConfigPanel = memo(function ApprovalConfigPanelComponent({
  config,
  onChange,
}: ApprovalConfigPanelProps) {
  const warnings = useMemo(() => buildWarnings(config), [config]);
  const notes = useMemo(() => buildNotes(config), [config]);

  return (
    <div className="divide-y divide-border/50">
      <MessageSection config={config} onChange={onChange} />
      <StrategySection config={config} onChange={onChange} />
      <ApproversSection config={config} onChange={onChange} />
      <ActionsSection config={config} onChange={onChange} />
      <TimeoutSection config={config} onChange={onChange} />
      <NotificationsSection config={config} onChange={onChange} />
      <WarningsList items={warnings} />
      <NotesList items={notes} />
    </div>
  );
});

ApprovalConfigPanel.displayName = "ApprovalConfigPanel";
