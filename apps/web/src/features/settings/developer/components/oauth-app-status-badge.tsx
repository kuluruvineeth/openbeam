"use client";

import { Badge } from "@openbeam/ui";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

type OAuthAppStatus = "draft" | "pending" | "approved" | "rejected";

const STATUS_LABELS: Record<OAuthAppStatus, string> = {
  draft: "Draft",
  pending: "Pending Review",
  approved: "Approved",
  rejected: "Rejected",
};

const statusVariants = cva("text-[11px]", {
  variants: {
    status: {
      draft: "border-border/50 bg-muted text-muted-foreground",
      pending:
        "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
      approved:
        "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      rejected: "border-destructive/30 bg-destructive/10 text-destructive",
    },
  },
  defaultVariants: {
    status: "draft",
  },
});

type OAuthAppStatusBadgeProps = {
  status: string;
  className?: string;
};

export function OAuthAppStatusBadge({
  status,
  className,
}: OAuthAppStatusBadgeProps) {
  const validStatus = (
    ["draft", "pending", "approved", "rejected"].includes(status)
      ? status
      : "draft"
  ) as OAuthAppStatus;

  return (
    <Badge
      className={cn(statusVariants({ status: validStatus }), className)}
      variant="outline"
    >
      {STATUS_LABELS[validStatus]}
    </Badge>
  );
}

export type { OAuthAppStatus };
