"use client";

import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { StatusBadge } from "../shared/status-badge";

type ApprovalCardProps = {
  approval: {
    id: string;
    type: string;
    title: string;
    status: string;
    requestedBy?: string | null;
    createdAt: Date | string;
  };
  className?: string;
};

const TYPE_LABELS: Record<string, string> = {
  HIRE_AGENT: "Hire Agent",
  APPROVE_CEO_STRATEGY: "CEO Strategy",
};

export function ApprovalCard({ approval, className }: ApprovalCardProps) {
  return (
    <Link
      className={cn(
        "block rounded-sm border border-border/50 p-4 transition-colors hover:border-border",
        className
      )}
      href={`/control/approvals/${approval.id}`}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="truncate font-medium text-sm">{approval.title}</h3>
        <StatusBadge domain="approval" status={approval.status} />
      </div>
      <div className="mt-2 flex items-center gap-3 text-muted-foreground text-xs">
        <span>{TYPE_LABELS[approval.type] ?? approval.type}</span>
        {approval.requestedBy && <span>{approval.requestedBy}</span>}
        <span>
          {formatDistanceToNow(new Date(approval.createdAt), {
            addSuffix: true,
          })}
        </span>
      </div>
    </Link>
  );
}
