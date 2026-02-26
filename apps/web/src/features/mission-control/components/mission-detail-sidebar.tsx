"use client";

import { Icons, ScrollArea } from "@openplane/ui";
import { formatCents } from "../lib/budget-utils";
import { AgentMiniCard } from "./agent-mini-card";
import { BudgetPressureBar } from "./budget-pressure-bar";
import { BudgetTierBadge } from "./budget-tier-badge";
import { PaymentSummaryCard } from "./payment-summary-card";
import { SidebarSection } from "./sidebar-section";
import { StatusChip } from "./status-chip";

type Mission = {
  id: string;
  name: string;
  objective: string;
  status: string;
  lane: string;
  createdAt: Date;
  budgetCents: number | null;
  consumedCents: number;
  budgetTier?: string;
};

type MissionStats = {
  totalAgents: number;
  totalTasks: number;
  completedTasks: number;
  totalTokens: number;
  totalCostCents: number;
};

type MissionAgent = {
  id: string;
  name: string;
  role: string;
  status: string;
};

type PaymentSummary = {
  totalReceipts: number;
  totalAmountUsd: number;
  verifiedCount: number;
  failedCount: number;
  pendingCount: number;
};

type MissionDetailSidebarProps = {
  mission: Mission;
  stats: MissionStats;
  agents: MissionAgent[];
  paymentSummary?: PaymentSummary | null;
};

function formatLane(lane: string): string {
  return lane.charAt(0).toUpperCase() + lane.slice(1);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1)}M`;
  }
  if (n >= 1000) {
    return `${(n / 1000).toFixed(1)}K`;
  }
  return String(n);
}

export function MissionDetailSidebar({
  mission,
  stats,
  agents,
  paymentSummary,
}: MissionDetailSidebarProps) {
  const budgetCents = mission.budgetCents ?? 0;

  return (
    <div className="flex w-60 shrink-0 flex-col border-border/50 border-r dark:border-[#1d1d1d] dark:bg-[#0c0c0c]">
      <ScrollArea className="flex-1">
        <SidebarSection title="Mission Info">
          <div className="space-y-2">
            <InfoRow label="Status">
              <StatusChip status={mission.status} />
            </InfoRow>
            <InfoRow label="Lane">
              <span className="text-sm">{formatLane(mission.lane)}</span>
            </InfoRow>
            <InfoRow label="Created">
              <span className="text-muted-foreground text-sm">
                {formatDate(mission.createdAt)}
              </span>
            </InfoRow>
          </div>
        </SidebarSection>

        <SidebarSection title="Budget">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs">Consumed</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm tabular-nums">
                  {formatCents(mission.consumedCents)}
                </span>
                {mission.budgetTier && (
                  <BudgetTierBadge tier={mission.budgetTier} />
                )}
              </div>
            </div>
            {budgetCents > 0 && (
              <BudgetPressureBar
                budgetCents={budgetCents}
                consumedCents={mission.consumedCents}
                tier={mission.budgetTier}
              />
            )}
          </div>
        </SidebarSection>

        {paymentSummary !== undefined && (
          <SidebarSection title="Payments">
            <PaymentSummaryCard data={paymentSummary} />
          </SidebarSection>
        )}

        <SidebarSection count={agents.length} title="Agent Squad">
          <div className="space-y-1">
            {agents.map((agent) => (
              <AgentMiniCard
                key={agent.id}
                name={agent.name}
                role={agent.role}
                status={agent.status}
              />
            ))}
            {agents.length === 0 && (
              <p className="py-2 text-muted-foreground text-xs">
                No agents assigned
              </p>
            )}
          </div>
        </SidebarSection>

        <SidebarSection title="Quick Stats">
          <div className="grid grid-cols-2 gap-2">
            <StatCell
              icon={<Icons.Users size={14} />}
              label="Agents"
              value={String(stats.totalAgents)}
            />
            <StatCell
              icon={<Icons.Task size={14} />}
              label="Tasks"
              value={`${stats.completedTasks}/${stats.totalTasks}`}
            />
            <StatCell
              icon={<Icons.Zap size={14} />}
              label="Tokens"
              value={formatNumber(stats.totalTokens)}
            />
            <StatCell
              icon={<Icons.Coins size={14} />}
              label="Cost"
              value={formatCents(stats.totalCostCents)}
            />
          </div>
        </SidebarSection>
      </ScrollArea>
    </div>
  );
}

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground text-xs">{label}</span>
      {children}
    </div>
  );
}

function StatCell({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-sm border border-border/30 p-2 dark:border-[#1d1d1d]">
      <div className="flex items-center gap-1 text-muted-foreground">
        {icon}
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <span className="font-medium font-mono text-sm tabular-nums">
        {value}
      </span>
    </div>
  );
}
