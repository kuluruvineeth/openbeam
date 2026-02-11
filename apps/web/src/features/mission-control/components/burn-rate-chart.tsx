"use client";

import type { MissionEventLedgerItem } from "@openplane/types/mission-control";
import { useMemo } from "react";
import {
  Area,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { buildBurnRateTimeline } from "../lib/budget-utils";

type ChartDataPoint = {
  timestamp: number;
  actual: number | null;
  projected: number | null;
};

const TWO_HOURS_MS = 2 * 60 * 60_000;
const PROJECTION_INTERVAL_MS = 5 * 60_000;

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDollar(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function buildProjectedPoints(
  lastTimestamp: number,
  lastCents: number,
  burnRatePerMinute: number,
  budgetCents: number
): ChartDataPoint[] {
  if (burnRatePerMinute <= 0) {
    return [];
  }

  const points: ChartDataPoint[] = [];
  const endMs = lastTimestamp + TWO_HOURS_MS;
  let currentMs = lastTimestamp;
  let currentCents = lastCents;

  while (currentMs <= endMs) {
    currentMs += PROJECTION_INTERVAL_MS;
    currentCents += burnRatePerMinute * (PROJECTION_INTERVAL_MS / 60_000);

    points.push({
      timestamp: currentMs,
      actual: null,
      projected: currentCents,
    });

    if (budgetCents > 0 && currentCents >= budgetCents) {
      break;
    }
  }

  return points;
}

type BurnRateChartProps = {
  events: MissionEventLedgerItem[];
  budgetCents: number;
  burnRatePerMinute: number;
};

type TooltipPayloadEntry = {
  dataKey: string;
  value: number | null;
  color: string;
};

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: number;
}) {
  if (!(active && payload?.length) || label === undefined) {
    return null;
  }

  const actualEntry = payload.find((p) => p.dataKey === "actual");
  const projectedEntry = payload.find((p) => p.dataKey === "projected");

  return (
    <div className="rounded-sm border border-border/50 bg-popover px-3 py-1.5 text-xs shadow-sm">
      <p className="font-mono text-muted-foreground tabular-nums">
        {formatTime(label)}
      </p>
      {actualEntry?.value !== null && actualEntry?.value !== undefined && (
        <p className="font-mono tabular-nums">
          Actual: {formatDollar(actualEntry.value)}
        </p>
      )}
      {projectedEntry?.value !== null &&
        projectedEntry?.value !== undefined && (
          <p className="font-mono text-muted-foreground tabular-nums">
            Projected: {formatDollar(projectedEntry.value)}
          </p>
        )}
    </div>
  );
}

export function BurnRateChart({
  events,
  budgetCents,
  burnRatePerMinute,
}: BurnRateChartProps) {
  const chartData = useMemo(() => {
    const timeline = buildBurnRateTimeline(events);

    const actualPoints: ChartDataPoint[] = timeline.map((dp) => ({
      timestamp: dp.timestamp,
      actual: dp.cumulativeCents,
      projected: null,
    }));

    if (actualPoints.length === 0) {
      return [];
    }

    const lastPoint = actualPoints.at(-1);
    if (!lastPoint) {
      return actualPoints;
    }

    const bridgePoint: ChartDataPoint = {
      timestamp: lastPoint.timestamp,
      actual: lastPoint.actual,
      projected: lastPoint.actual,
    };

    const projectedPoints = buildProjectedPoints(
      lastPoint.timestamp,
      lastPoint.actual ?? 0,
      burnRatePerMinute,
      budgetCents
    );

    return [...actualPoints, bridgePoint, ...projectedPoints];
  }, [events, burnRatePerMinute, budgetCents]);

  if (chartData.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-muted-foreground text-xs">
        No cost data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer height={200} width="100%">
      <ComposedChart
        data={chartData}
        margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
      >
        <XAxis
          axisLine={false}
          dataKey="timestamp"
          stroke="var(--muted-foreground)"
          strokeOpacity={0.3}
          tick={{ fontSize: 10 }}
          tickFormatter={formatTime}
          tickLine={false}
        />
        <YAxis
          axisLine={false}
          stroke="var(--muted-foreground)"
          strokeOpacity={0.3}
          tick={{ fontSize: 10 }}
          tickFormatter={(v: number) => formatDollar(v)}
          tickLine={false}
          width={50}
        />
        <Tooltip content={<ChartTooltip />} />
        <Area
          connectNulls={false}
          dataKey="actual"
          dot={false}
          fill="var(--primary)"
          fillOpacity={0.1}
          isAnimationActive={false}
          stroke="var(--primary)"
          strokeWidth={1.5}
          type="monotone"
        />
        <Line
          connectNulls={false}
          dataKey="projected"
          dot={false}
          isAnimationActive={false}
          stroke="var(--muted-foreground)"
          strokeDasharray="4 4"
          strokeOpacity={0.5}
          strokeWidth={1.5}
          type="monotone"
        />
        {budgetCents > 0 && (
          <ReferenceLine
            stroke="var(--destructive)"
            strokeDasharray="8 4"
            strokeWidth={1}
            y={budgetCents}
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
