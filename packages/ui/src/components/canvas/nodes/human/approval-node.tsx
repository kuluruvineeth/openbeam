"use client";

import type {
  ApprovalNodeConfig,
  ApprovalSeverity,
  Approver,
  NodeStatus,
  Port,
} from "@openplane/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { forwardRef, memo, useMemo } from "react";
import { cn } from "../../../../utils";
import { formatDuration, getInitials } from "../../../../utils/format";
import { Avatar, AvatarFallback, AvatarImage } from "../../../avatar";
import { Icons } from "../../../icons";
import { NodeField, NodeHeader, NodeSection, NodeShell } from "../primitives";

type ApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "expired"
  | "escalated";

export interface ApprovalNodeData {
  label: string;
  config: ApprovalNodeConfig;
  inputs?: Port[];
  outputs?: Port[];
  status?: NodeStatus;
  approvalStatus?: ApprovalStatus;
  currentApprovals?: number;
  [key: string]: unknown;
}

type ApprovalNodeType = Node<ApprovalNodeData, "approval">;

const SEVERITY_BORDER: Record<ApprovalSeverity, string> = {
  low: "border-l-emerald-500",
  medium: "border-l-amber-500",
  high: "border-l-orange-500",
  critical: "border-l-red-500",
};

const SEVERITY_LABEL: Record<ApprovalSeverity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

const STATUS_CONFIG: Record<
  ApprovalStatus,
  { icon: keyof typeof Icons; label: string; color: string }
> = {
  pending: { icon: "Clock", label: "Pending", color: "text-muted-foreground" },
  approved: { icon: "CheckIcon", label: "Approved", color: "text-emerald-600" },
  rejected: { icon: "Close", label: "Rejected", color: "text-red-600" },
  expired: { icon: "Clock", label: "Expired", color: "text-amber-600" },
  escalated: {
    icon: "ChevronUp",
    label: "Escalated",
    color: "text-orange-600",
  },
};

const STRATEGY_LABEL: Record<string, string> = {
  single: "Single",
  sequential: "Sequential",
  parallel: "Parallel",
};

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

export const ApprovalNode = memo(
  forwardRef<HTMLDivElement, NodeProps<ApprovalNodeType>>(
    function ApprovalNodeComponent({ data, selected }, ref) {
      const severity = data.config.severity ?? "medium";
      const approvalType = data.config.approvalType ?? "single";
      const requiredApprovals = data.config.requiredApprovals ?? 1;
      const currentApprovals = data.currentApprovals ?? 0;
      const approvalStatus: ApprovalStatus = data.approvalStatus ?? "pending";
      const approvers = data.config.approvers ?? [];
      const warnings = useMemo(() => buildWarnings(data.config), [data.config]);
      const notes = useMemo(() => buildNotes(data.config), [data.config]);

      const statusCfg = STATUS_CONFIG[approvalStatus];
      const StatusIcon = Icons[statusCfg.icon];
      const showProgress = approvalType !== "single" && requiredApprovals > 1;
      const progressPercent = showProgress
        ? Math.min((currentApprovals / requiredApprovals) * 100, 100)
        : 0;

      return (
        <NodeShell
          className={cn("border-l-2", SEVERITY_BORDER[severity])}
          handles={[
            { type: "target", position: Position.Left },
            {
              id: "approved",
              type: "source",
              position: Position.Right,
              offset: "35%",
              variant: "true",
            },
            {
              id: "rejected",
              type: "source",
              position: Position.Right,
              offset: "65%",
              variant: "false",
            },
          ]}
          ref={ref}
          selected={selected}
          status={data.status}
        >
          <div className="pointer-events-none absolute top-[32%] right-[-36px] text-muted-foreground text-xs">
            Yes
          </div>
          <div className="pointer-events-none absolute top-[62%] right-[-30px] text-muted-foreground text-xs">
            No
          </div>
          <NodeHeader
            badge={
              <span className="rounded-sm bg-muted px-1.5 py-0.5 font-medium text-[10px] text-muted-foreground">
                {STRATEGY_LABEL[approvalType] ?? approvalType}
              </span>
            }
            colorVar="--node-approval"
            icon={<Icons.UserCheck className="size-5" />}
            subtitle={SEVERITY_LABEL[severity]}
            title={data.label}
          />
          <NodeSection>
            <div className="space-y-2">
              <NodeField label="Status">
                <div className={cn("flex items-center gap-1", statusCfg.color)}>
                  <StatusIcon className="size-3" />
                  <span>{statusCfg.label}</span>
                </div>
              </NodeField>

              {showProgress && (
                <div className="space-y-1">
                  <NodeField label="Progress">
                    <span className="font-mono">
                      {currentApprovals}/{requiredApprovals}
                    </span>
                  </NodeField>
                  <div className="h-1.5 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}

              {approvers.length > 0 && (
                <div className="flex items-center gap-1 pt-1">
                  <div className="-space-x-1.5 flex">
                    {approvers.slice(0, 3).map((approver: Approver) => (
                      <Avatar
                        className="size-5 border border-background"
                        key={approver.id}
                      >
                        <AvatarImage src={approver.avatar} />
                        <AvatarFallback className="text-[8px]">
                          {getInitials(approver.name)}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  {approvers.length > 3 && (
                    <span className="text-muted-foreground text-xs">
                      +{approvers.length - 3}
                    </span>
                  )}
                </div>
              )}

              {data.config.timeoutMs && data.config.timeoutMs > 0 && (
                <div className="flex items-center gap-1 pt-0.5 text-muted-foreground text-xs">
                  <Icons.Clock className="size-3" />
                  <span>{formatDuration(data.config.timeoutMs)}</span>
                </div>
              )}

              {warnings.length > 0 && (
                <div className="space-y-1">
                  {warnings.map((warning) => (
                    <div
                      className="flex items-center gap-1.5 text-[10px] text-warning"
                      key={warning}
                    >
                      <Icons.AlertCircle size={12} />
                      <span>{warning}</span>
                    </div>
                  ))}
                </div>
              )}

              {notes.length > 0 && (
                <div className="space-y-1">
                  {notes.map((note) => (
                    <div
                      className="flex items-center gap-1.5 text-[10px] text-muted-foreground"
                      key={note}
                    >
                      <Icons.Info size={12} />
                      <span>{note}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </NodeSection>
        </NodeShell>
      );
    }
  )
);

ApprovalNode.displayName = "ApprovalNode";

export function createApprovalNodeData(): ApprovalNodeData {
  return {
    label: "Approval",
    config: {
      message: "",
      approvalType: "single",
      requiredApprovals: 1,
      severity: "medium",
      allowedActions: ["approve", "reject"],
      timeoutAction: "reject",
      autoApprove: false,
      requireComment: false,
    },
    inputs: [{ id: "request", label: "Request", type: "data", required: true }],
    outputs: [
      { id: "approved", label: "Approved", type: "data", required: false },
      { id: "rejected", label: "Rejected", type: "data", required: false },
    ],
    approvalStatus: "pending",
    currentApprovals: 0,
  };
}
