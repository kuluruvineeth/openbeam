"use client";

import { cn } from "@openbeam/ui";
import {
  CartesianGrid,
  Legend,
  ScatterChart as RechartsScatterChart,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AXIS_STYLE,
  COMPACT_CHART_HEIGHT,
  DEFAULT_CHART_HEIGHT,
  GRID_STYLE,
} from "../../constants";
import {
  coerceNumericData,
  formatChartValue,
  resolveColors,
  resolveXKey,
  resolveYKeys,
} from "../../lib/chart-utils";
import type { ChartConfig, ChartData } from "../../types";
import { ChartEmpty } from "../chart-empty";

type ScatterChartProps = {
  data: ChartData;
  config: ChartConfig;
  compact?: boolean;
  className?: string;
};

export function ScatterChartView({
  data,
  config,
  compact,
  className,
}: ScatterChartProps) {
  const processed = coerceNumericData(data, config);
  if (processed.length === 0) {
    return <ChartEmpty size={compact ? "compact" : "default"} />;
  }

  const xKey = resolveXKey(processed, config);
  const yKeys = resolveYKeys(processed, config);
  const colors = resolveColors(config, yKeys.length);
  const height =
    config.height ?? (compact ? COMPACT_CHART_HEIGHT : DEFAULT_CHART_HEIGHT);
  const showLegend =
    config.showLegend !== false && yKeys.length > 1 && !compact;
  const showGrid = config.showGrid !== false;

  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer height={height} width="100%">
        <RechartsScatterChart
          margin={{ top: 8, right: 16, left: 0, bottom: 4 }}
        >
          {showGrid && <CartesianGrid {...GRID_STYLE} />}
          <XAxis
            axisLine={{ stroke: "hsl(var(--border))" }}
            dataKey={xKey}
            name={xKey}
            tick={AXIS_STYLE}
            tickLine={false}
          />
          <YAxis
            axisLine={false}
            tick={AXIS_STYLE}
            tickFormatter={formatChartValue}
            tickLine={false}
            width={48}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 6,
              fontSize: 12,
            }}
          />
          {yKeys.map((key, i) => {
            const seriesData = processed
              .filter((row) => row[key] != null)
              .map((row) => ({
                [xKey]: row[xKey],
                [key]: row[key],
              }));
            return (
              <Scatter
                data={seriesData}
                fill={colors[i]}
                key={key}
                name={key}
              />
            );
          })}
          {showLegend && <Legend wrapperStyle={{ fontSize: 11 }} />}
        </RechartsScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
