"use client";

import Link from "next/link";
import { MetricCard } from "../shared/metric-card";

type PendingApprovalsProps = {
  count: number;
};

export function PendingApprovals({ count }: PendingApprovalsProps) {
  return (
    <Link href="/control/approvals">
      <MetricCard
        className="transition-colors hover:border-border"
        detail={count > 0 ? "Requires attention" : "All clear"}
        label="Pending Approvals"
        value={count}
      />
    </Link>
  );
}
