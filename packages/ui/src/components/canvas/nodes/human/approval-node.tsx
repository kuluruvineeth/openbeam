"use client";

import type { NodeStatus, Port } from "@openplane/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { CheckCircle2, Clock, UserCheck, XCircle } from "lucide-react";
import { forwardRef, memo } from "react";
import { cn } from "../../../../utils";
import { NodeField, NodeHeader, NodeSection, NodeShell } from "../primitives";

export interface Approver {
  id: string;
  name: string;
  avatar?: string;
  status?: "pending" | "approved" | "rejected";
}

export interface ApprovalNodeConfig {
  approvalType: "single" | "multi";
  requiredApprovals: number;
  timeout?: number;
  autoReject?: boolean;
}

export interface ApprovalNodeData {
  label: string;
  config: ApprovalNodeConfig;
  inputs?: Port[];
  outputs?: Port[];
  status?: NodeStatus;
  approvalStatus?: "pending" | "approved" | "rejected" | "expired";
  currentApprovals?: number;
  approvers?: Approver[];
  deadline?: string;
  [key: string]: unknown;
}

type ApprovalNodeType = Node<ApprovalNodeData, "approval">;

const APPROVAL_STATUS_CONFIG = {
  pending: { icon: Clock, label: "Pending" },
  approved: { icon: CheckCircle2, label: "Approved" },
  rejected: { icon: XCircle, label: "Rejected" },
  expired: { icon: Clock, label: "Expired" },
} as const;

export const ApprovalNode = memo(
  forwardRef<HTMLDivElement, NodeProps<ApprovalNodeType>>(
    function ApprovalNodeComponent({ data, selected }, ref) {
      const approvalStatus = data.approvalStatus ?? "pending";
      const approvalType = data.config.approvalType ?? "single";
      const requiredApprovals = data.config.requiredApprovals ?? 1;
      const currentApprovals = data.currentApprovals ?? 0;
      const approverCount = data.approvers?.length ?? 0;

      const currentStatus = APPROVAL_STATUS_CONFIG[approvalStatus];
      const StatusIcon = currentStatus.icon;

      return (
        <NodeShell
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
            colorVar="--node-approval"
            icon={<UserCheck className="size-5" />}
            subtitle={
              approvalType === "multi" ? "Multi-approval" : "Single approval"
            }
            title={data.label}
          />
          <NodeSection>
            <div className="space-y-2">
              <NodeField label="Status">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <StatusIcon className="size-3" />
                  <span>{currentStatus.label}</span>
                </div>
              </NodeField>
              {approvalType === "multi" && (
                <div className="space-y-1">
                  <NodeField label="Progress">
                    <span className="font-mono">
                      {currentApprovals}/{requiredApprovals}
                    </span>
                  </NodeField>
                  <div className="h-1.5 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{
                        width: `${Math.min((currentApprovals / requiredApprovals) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}
              {approverCount > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {data.approvers?.slice(0, 3).map((approver) => (
                    <span
                      className={cn(
                        "rounded-sm px-2 py-0.5 text-xs",
                        approver.status === "approved" &&
                          "bg-muted text-foreground",
                        approver.status === "rejected" &&
                          "bg-destructive/10 text-destructive",
                        approver.status === "pending" &&
                          "bg-muted text-muted-foreground"
                      )}
                      key={approver.id}
                    >
                      {approver.name.split(" ")[0]}
                    </span>
                  ))}
                  {approverCount > 3 && (
                    <span className="text-muted-foreground text-xs">
                      +{approverCount - 3}
                    </span>
                  )}
                </div>
              )}
              {data.deadline && (
                <div className="flex items-center gap-1 pt-1 text-muted-foreground text-xs">
                  <Clock className="size-3" />
                  <span>
                    Due: {new Date(data.deadline).toLocaleDateString()}
                  </span>
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
      approvalType: "single",
      requiredApprovals: 1,
      timeout: 86_400_000,
      autoReject: false,
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
