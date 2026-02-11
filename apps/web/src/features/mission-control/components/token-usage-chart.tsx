"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const AGENT_SHADES = [
  "hsl(var(--primary))",
  "hsl(var(--primary) / 0.7)",
  "hsl(var(--primary) / 0.5)",
  "hsl(var(--primary) / 0.3)",
  "hsl(var(--muted-foreground))",
];

const ROW_HEIGHT_PX = 40;
const CHART_PADDING_PX = 40;

function formatTokenLabel(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}k`;
  }
  return String(tokens);
}

type TokenUsageChartProps = {
  tokensByAgent: Record<string, number>;
};

type TokenDataPoint = {
  agentName: string;
  tokens: number;
};

type TooltipPayloadEntry = {
  payload: TokenDataPoint;
};

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
}) {
  if (!(active && payload?.length)) {
    return null;
  }

  const entry = payload[0].payload;
  return (
    <div className="rounded-sm border border-border/50 bg-popover px-3 py-1.5 text-xs shadow-sm">
      <p className="font-medium">{entry.agentName}</p>
      <p className="font-mono tabular-nums">
        {formatTokenLabel(entry.tokens)} tokens
      </p>
    </div>
  );
}

export function TokenUsageChart({ tokensByAgent }: TokenUsageChartProps) {
  const chartData = useMemo(
    (): TokenDataPoint[] =>
      Object.entries(tokensByAgent)
        .sort(([, a], [, b]) => b - a)
        .map(([agentName, tokens]) => ({ agentName, tokens })),
    [tokensByAgent]
  );

  if (chartData.length === 0) {
    return (
      <div className="flex h-[120px] items-center justify-center text-muted-foreground text-xs">
        No token data
      </div>
    );
  }

  const chartHeight = chartData.length * ROW_HEIGHT_PX + CHART_PADDING_PX;

  return (
    <ResponsiveContainer height={chartHeight} width="100%">
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
      >
        <XAxis
          axisLine={false}
          stroke="var(--muted-foreground)"
          strokeOpacity={0.3}
          tick={{ fontSize: 10 }}
          tickFormatter={formatTokenLabel}
          tickLine={false}
          type="number"
        />
        <YAxis
          axisLine={false}
          dataKey="agentName"
          stroke="var(--muted-foreground)"
          strokeOpacity={0.3}
          tick={{ fontSize: 10 }}
          tickLine={false}
          type="category"
          width={80}
        />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey="tokens" isAnimationActive={false} radius={0}>
          {chartData.map((_, index) => (
            <Cell
              fill={AGENT_SHADES[index % AGENT_SHADES.length]}
              key={chartData[index].agentName}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
