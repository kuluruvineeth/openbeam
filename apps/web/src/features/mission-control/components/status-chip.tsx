"use client";

import { cva, type VariantProps } from "class-variance-authority";

const VALID_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
  "CANCELLED",
  "ARCHIVED",
] as const;

type MissionStatus = (typeof VALID_STATUSES)[number];

const statusChipVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium text-xs",
  {
    variants: {
      status: {
        DRAFT: "bg-muted text-muted-foreground",
        ACTIVE: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        PAUSED: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
        COMPLETED: "bg-primary/10 text-primary",
        CANCELLED: "bg-destructive/10 text-destructive",
        ARCHIVED: "bg-muted text-muted-foreground",
      },
    },
  }
);

function resolveStatus(raw: string): MissionStatus {
  return (VALID_STATUSES as readonly string[]).includes(raw)
    ? (raw as MissionStatus)
    : "DRAFT";
}

function formatStatusLabel(status: MissionStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

type StatusChipProps = {
  status: string;
} & Omit<VariantProps<typeof statusChipVariants>, "status">;

export function StatusChip({ status }: StatusChipProps) {
  const resolved = resolveStatus(status);

  return (
    <span className={statusChipVariants({ status: resolved })}>
      {resolved === "ACTIVE" && (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
      )}
      {formatStatusLabel(resolved)}
    </span>
  );
}

export { statusChipVariants, type MissionStatus };
