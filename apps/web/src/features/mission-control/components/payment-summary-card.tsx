"use client";

import { Icons } from "@openplane/ui";

type PaymentSummaryData = {
  totalReceipts: number;
  totalAmountUsd: number;
  verifiedCount: number;
  failedCount: number;
  pendingCount: number;
};

type PaymentSummaryCardProps = {
  data: PaymentSummaryData | null;
};

function formatUsd(amount: number): string {
  return `$${amount.toFixed(4)}`;
}

export function PaymentSummaryCard({ data }: PaymentSummaryCardProps) {
  if (!data || data.totalReceipts === 0) {
    return (
      <div className="flex items-center gap-2 rounded-sm border border-border/30 p-3 dark:border-[#1d1d1d]">
        <Icons.Coins className="text-muted-foreground" size={14} />
        <span className="text-muted-foreground text-xs">No payments yet</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-medium font-mono text-sm tabular-nums">
          {formatUsd(data.totalAmountUsd)}
        </span>
        <span className="text-muted-foreground text-xs">USDC</span>
      </div>

      <div className="grid grid-cols-3 gap-1">
        <MiniStat
          count={data.verifiedCount}
          label="Verified"
          variant="success"
        />
        <MiniStat count={data.pendingCount} label="Pending" variant="warning" />
        <MiniStat count={data.failedCount} label="Failed" variant="danger" />
      </div>

      <div className="flex items-center justify-between text-muted-foreground text-xs">
        <span>{data.totalReceipts} receipts</span>
        <span>Base Sepolia</span>
      </div>
    </div>
  );
}

function MiniStat({
  count,
  label,
  variant,
}: {
  count: number;
  label: string;
  variant: "success" | "warning" | "danger";
}) {
  const dotColor = {
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-destructive",
  }[variant];

  return (
    <div className="flex items-center gap-1 text-xs">
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
      <span className="font-mono tabular-nums">{count}</span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}
