"use client";

import { Skeleton } from "@openplane/ui";

type DashboardStats = {
  activeMissions: number;
  totalAgents: number;
  completionRate: number;
  totalCostCents: number;
};

type MissionSummaryCardsProps = {
  stats: DashboardStats | undefined;
  isLoading: boolean;
};

function formatDollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatPercentage(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

const CARD_DEFINITIONS = [
  {
    label: "Active Missions",
    key: "activeMissions" as const,
    format: (v: number) => String(v),
  },
  {
    label: "Total Agents",
    key: "totalAgents" as const,
    format: (v: number) => String(v),
  },
  {
    label: "Completion Rate",
    key: "completionRate" as const,
    format: formatPercentage,
  },
  {
    label: "Total Cost",
    key: "totalCostCents" as const,
    format: formatDollars,
  },
] as const;

function MissionSummaryCards({ stats, isLoading }: MissionSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {CARD_DEFINITIONS.map((card) => (
        <div
          className="rounded-md border border-border/50 bg-card p-4"
          key={card.key}
        >
          <span className="text-muted-foreground text-xs">{card.label}</span>
          {isLoading || !stats ? (
            <Skeleton className="mt-1 h-8 w-20" />
          ) : (
            <p className="mt-1 font-semibold text-2xl tabular-nums">
              {card.format(stats[card.key])}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

export { MissionSummaryCards };
export type { DashboardStats, MissionSummaryCardsProps };
