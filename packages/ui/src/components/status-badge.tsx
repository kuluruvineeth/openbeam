"use client";

import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "../utils/cn";

const CONNECTOR_STATUS_MAP: Record<string, { color: string; label: string }> = {
  ACTIVE: { color: "bg-emerald-500", label: "Active" },
  ERROR: { color: "bg-red-500", label: "Error" },
  SYNCING: { color: "bg-amber-500", label: "Syncing" },
  INACTIVE: { color: "bg-zinc-400", label: "Inactive" },
  CONNECTING: { color: "bg-blue-500", label: "Connecting" },
  PAUSED: { color: "bg-zinc-400", label: "Paused" },
  RATE_LIMITED: { color: "bg-amber-500", label: "Rate Limited" },
  AUTH_EXPIRED: { color: "bg-red-500", label: "Auth Expired" },
};

const OAUTH_STATUS_MAP: Record<string, { color: string; label: string }> = {
  draft: { color: "bg-zinc-400", label: "Draft" },
  pending: { color: "bg-amber-500", label: "Pending Review" },
  approved: { color: "bg-emerald-500", label: "Approved" },
  rejected: { color: "bg-red-500", label: "Rejected" },
};

const HEALTH_STATUS_MAP: Record<string, { color: string; label: string }> = {
  healthy: { color: "bg-emerald-500", label: "Healthy" },
  degraded: { color: "bg-amber-500", label: "Degraded" },
  unhealthy: { color: "bg-red-500", label: "Unhealthy" },
  unknown: { color: "bg-zinc-400", label: "Unknown" },
};

const STATUS_MAPS: Record<
  string,
  Record<string, { color: string; label: string }>
> = {
  connector: CONNECTOR_STATUS_MAP,
  oauth: OAUTH_STATUS_MAP,
  health: HEALTH_STATUS_MAP,
};

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 font-medium text-[11px]",
  {
    variants: {
      variant: {
        dot: "bg-transparent",
        filled: "",
      },
    },
    defaultVariants: {
      variant: "dot",
    },
  }
);

type StatusBadgeProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof statusBadgeVariants> & {
    status: string;
    type?: "connector" | "oauth" | "health";
  };

const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  (
    { className, status, type = "connector", variant = "dot", ...props },
    ref
  ) => {
    const map = STATUS_MAPS[type] ?? CONNECTOR_STATUS_MAP;
    const entry = map[status] ?? { color: "bg-zinc-400", label: status };

    return (
      <span
        className={cn(statusBadgeVariants({ variant }), className)}
        ref={ref}
        {...props}
      >
        <span
          className={cn("inline-block size-1.5 rounded-full", entry.color)}
        />
        {entry.label}
      </span>
    );
  }
);
StatusBadge.displayName = "StatusBadge";

export { StatusBadge, statusBadgeVariants };
export type { StatusBadgeProps };
