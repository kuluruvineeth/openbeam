"use client";

import { Icons } from "@openplane/ui";
import type { ReactNode } from "react";

type DashboardStats = {
  activeMissions: number;
  totalAgents: number;
  completionRate: number;
  totalCostCents: number;
};

type MissionSummaryCardsProps = {
  stats: DashboardStats;
};

function formatDollars(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPercentage(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

type CardDefinition = {
  key: keyof DashboardStats;
  title: string;
  description: string;
  icon: ReactNode;
  format: (v: number) => string;
  action: string;
};

const CARD_DEFINITIONS: CardDefinition[] = [
  {
    key: "activeMissions",
    title: "Active Missions",
    description: "Currently running missions",
    icon: <Icons.Target className="size-4" />,
    format: (v) => String(v),
    action: "View missions",
  },
  {
    key: "totalAgents",
    title: "Total Agents",
    description: "Agents deployed across missions",
    icon: <Icons.BotIcon className="size-4" />,
    format: (v) => String(v),
    action: "View agents",
  },
  {
    key: "completionRate",
    title: "Completion Rate",
    description: "Tasks completed across all missions",
    icon: <Icons.CheckCircle className="size-4" />,
    format: formatPercentage,
    action: "View progress",
  },
  {
    key: "totalCostCents",
    title: "Total Cost",
    description: "Cumulative spend this period",
    icon: <Icons.DollarSign className="size-4" />,
    format: formatDollars,
    action: "View breakdown",
  },
];

function MissionSummaryCards({ stats }: MissionSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {CARD_DEFINITIONS.map((card) => (
        <div
          className="group flex h-[210px] cursor-pointer flex-col justify-between rounded-sm border border-border/50 bg-card p-4 transition-all duration-300 hover:border-border hover:bg-[#F2F1EF] dark:border-[#1d1d1d] dark:bg-[#0c0c0c] dark:hover:border-[#222222] dark:hover:bg-[#0f0f0f]"
          key={card.key}
        >
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="text-muted-foreground">{card.icon}</span>
              <h3 className="font-medium text-muted-foreground text-xs">
                {card.title}
              </h3>
            </div>
            <p className="text-muted-foreground text-sm">{card.description}</p>
          </div>

          <div>
            <p className="mb-2 font-normal text-2xl tabular-nums">
              {card.format(stats[card.key])}
            </p>
            <span className="text-muted-foreground text-xs transition-colors duration-300 group-hover:text-foreground">
              {card.action}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export { MissionSummaryCards };
export type { DashboardStats, MissionSummaryCardsProps };
