"use client";

import { memo, useMemo } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCents } from "../lib/budget-utils";

const AGENT_SHADES = [
  "hsl(var(--primary))",
  "hsl(var(--primary) / 0.7)",
  "hsl(var(--primary) / 0.5)",
  "hsl(var(--primary) / 0.3)",
  "hsl(var(--muted-foreground))",
];

function formatTokenCount(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}k`;
  }
  return String(tokens);
}

type AgentBoardInfo = {
  role: string;
  totalTokens: number;
};

type AgentCostBreakdownProps = {
  consumedByAgent: Record<string, number>;
  agentBoard: Record<string, AgentBoardInfo>;
};

type AgentRow = {
  agentName: string;
  role: string;
  costCents: number;
  percentage: number;
  tokens: number;
  shade: string;
};

type TooltipPayloadEntry = {
  dataKey: string;
  payload: { agentName: string; costCents: number };
  color: string;
};

function _ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
}) {
  if (!(active && payload?.length)) {
    return null;
  }

  const entry = payload[0];
  return (
    <div className="rounded-sm border border-border/50 bg-popover px-3 py-1.5 text-xs shadow-sm">
      <p className="font-medium">{entry.payload.agentName}</p>
      <p className="font-mono tabular-nums">
        {formatCents(entry.payload.costCents)}
      </p>
    </div>
  );
}

const CostTableRow = memo(function CostTableRowInner({
  row,
}: {
  row: AgentRow;
}) {
  return (
    <tr className="border-border/50 border-b last:border-b-0">
      <td className="py-1 pr-3">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 shrink-0 rounded-sm"
            style={{ backgroundColor: row.shade }}
          />
          <span className="truncate font-medium text-xs">{row.agentName}</span>
        </div>
      </td>
      <td className="py-1 pr-3 text-muted-foreground text-xs">{row.role}</td>
      <td className="py-1 pr-3 text-right font-mono text-xs tabular-nums">
        {formatCents(row.costCents)}
      </td>
      <td className="py-1 pr-3 text-right font-mono text-muted-foreground text-xs tabular-nums">
        {row.percentage.toFixed(1)}%
      </td>
      <td className="py-1 text-right font-mono text-muted-foreground text-xs tabular-nums">
        {formatTokenCount(row.tokens)}
      </td>
    </tr>
  );
});

export function AgentCostBreakdown({
  consumedByAgent,
  agentBoard,
}: AgentCostBreakdownProps) {
  const rows = useMemo(() => {
    const entries = Object.entries(consumedByAgent);
    const totalCost = entries.reduce((sum, [, cost]) => sum + cost, 0);

    return entries
      .sort(([, a], [, b]) => b - a)
      .map(([agentName, costCents], index): AgentRow => {
        const info = agentBoard[agentName];
        return {
          agentName,
          role: info?.role ?? "",
          costCents,
          percentage: totalCost > 0 ? (costCents / totalCost) * 100 : 0,
          tokens: info?.totalTokens ?? 0,
          shade: AGENT_SHADES[index % AGENT_SHADES.length],
        };
      });
  }, [consumedByAgent, agentBoard]);

  if (rows.length === 0) {
    return (
      <div className="flex h-[160px] items-center justify-center text-muted-foreground text-xs">
        No agent cost data
      </div>
    );
  }

  const _chartData = rows.map((row) => ({
    agentName: row.agentName,
    costCents: row.costCents,
  }));

  return (
    <div className="flex flex-col gap-3">
      <ResponsiveContainer height={160} width="100%">
        <BarChart
          data={[
            {
              name: "cost",
              ...Object.fromEntries(
                rows.map((r) => [r.agentName, r.costCents])
              ),
            },
          ]}
          margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
        >
          <XAxis hide />
          <YAxis hide />
          <Tooltip
            content={({ active, payload }) => {
              if (!(active && payload?.length)) {
                return null;
              }
              const entry = payload[0];
              return (
                <div className="rounded-sm border border-border/50 bg-popover px-3 py-1.5 text-xs shadow-sm">
                  <p className="font-medium">{String(entry.name)}</p>
                  <p className="font-mono tabular-nums">
                    {formatCents(entry.value as number)}
                  </p>
                </div>
              );
            }}
          />
          {rows.map((row) => (
            <Bar
              dataKey={row.agentName}
              fill={row.shade}
              isAnimationActive={false}
              key={row.agentName}
              radius={0}
              stackId="cost"
            />
          ))}
        </BarChart>
      </ResponsiveContainer>

      <table className="w-full">
        <thead>
          <tr className="border-border/50 border-b text-muted-foreground text-xs">
            <th className="pr-3 pb-1 text-left font-medium">Agent</th>
            <th className="pr-3 pb-1 text-left font-medium">Role</th>
            <th className="pr-3 pb-1 text-right font-medium">Cost</th>
            <th className="pr-3 pb-1 text-right font-medium">%</th>
            <th className="pb-1 text-right font-medium">Tokens</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <CostTableRow key={row.agentName} row={row} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
