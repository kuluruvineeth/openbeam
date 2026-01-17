"use client";

import type { Node, NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import { CheckCircle2, Clock, UserCheck, Users, XCircle } from "lucide-react";
import { forwardRef, memo } from "react";
import { cn } from "../../../../utils";
import type { NodePortDefinition } from "../base-node";

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
  inputs: NodePortDefinition[];
  outputs: NodePortDefinition[];
  status?: "pending" | "approved" | "rejected" | "expired";
  currentApprovals?: number;
  approvers?: Approver[];
  deadline?: string;
  [key: string]: unknown;
}

type ApprovalNodeType = Node<ApprovalNodeData, "approval">;

export const ApprovalNode = memo(
  forwardRef<HTMLDivElement, NodeProps<ApprovalNodeType>>(
    function ApprovalNodeComponent({ data, selected }, ref) {
      const status = data.status ?? "pending";
      const approvalType = data.config.approvalType ?? "single";
      const requiredApprovals = data.config.requiredApprovals ?? 1;
      const currentApprovals = data.currentApprovals ?? 0;
      const approverCount = data.approvers?.length ?? 0;

      const statusConfig = {
        pending: { color: "text-yellow-500", icon: Clock, label: "Pending" },
        approved: {
          color: "text-green-500",
          icon: CheckCircle2,
          label: "Approved",
        },
        rejected: { color: "text-red-500", icon: XCircle, label: "Rejected" },
        expired: {
          color: "text-muted-foreground",
          icon: Clock,
          label: "Expired",
        },
      } as const;

      const currentStatus = statusConfig[status as keyof typeof statusConfig];
      const color = currentStatus.color;
      const StatusIcon = currentStatus.icon;
      const statusLabel = currentStatus.label;

      return (
        <div
          className={cn(
            "flex min-w-[220px] flex-col rounded-sm border border-green-500/50 bg-green-500/5 shadow-sm",
            selected && "ring-2 ring-primary ring-offset-1"
          )}
          ref={ref}
        >
          <Handle
            className="h-3! w-3! border-2! border-background! bg-green-500!"
            position={Position.Left}
            type="target"
          />

          <div className="flex items-center gap-2 rounded-t-sm bg-green-500/10 px-3 py-2">
            <div className="flex h-6 w-6 items-center justify-center text-green-500">
              <UserCheck className="h-4 w-4" />
            </div>
            <span className="font-medium text-sm">{data.label}</span>
          </div>

          <div className="space-y-1.5 border-border/50 border-t px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs">Status</span>
              <div className={cn("flex items-center gap-1", color)}>
                <StatusIcon className="h-3 w-3" />
                <span className="text-xs">{statusLabel}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs">Type</span>
              <div className="flex items-center gap-1 text-xs">
                {approvalType === "multi" ? (
                  <>
                    <Users className="h-3 w-3" />
                    <span>Multi-approval</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="h-3 w-3" />
                    <span>Single</span>
                  </>
                )}
              </div>
            </div>

            {approvalType === "multi" && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">
                    {currentApprovals}/{requiredApprovals}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-green-500 transition-all"
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
                      "rounded-sm px-1.5 py-0.5 text-xs",
                      approver.status === "approved" &&
                        "bg-green-500/20 text-green-500",
                      approver.status === "rejected" &&
                        "bg-red-500/20 text-red-500",
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
                <Clock className="h-3 w-3" />
                <span>Due: {new Date(data.deadline).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          <Handle
            className="h-3! w-3! border-2! border-background! bg-green-500!"
            id="approved"
            position={Position.Right}
            style={{ top: "35%" }}
            type="source"
          />
          <Handle
            className="h-3! w-3! border-2! border-background! bg-red-500!"
            id="rejected"
            position={Position.Right}
            style={{ top: "65%" }}
            type="source"
          />
        </div>
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
    status: "pending",
    currentApprovals: 0,
  };
}
