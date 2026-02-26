"use client";

import { cn } from "@openplane/ui";
import {
  Bar,
  CartesianGrid,
  Legend,
  BarChart as RechartsBarChart,
  ResponsiveContainer,
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
  formatChartLabel,
  formatChartValue,
  resolveColors,
  resolveXKey,
  resolveYKeys,
} from "../../lib/chart-utils";
import type { ChartConfig, ChartData } from "../../types";
import { ChartEmpty } from "../chart-empty";

type BarChartProps = {
  data: ChartData;
  config: ChartConfig;
  compact?: boolean;
  className?: string;
};

export function BarChartView({
  data,
  config,
  compact,
  className,
}: BarChartProps) {
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
        <RechartsBarChart
          data={processed}
          margin={{ top: 8, right: 16, left: 0, bottom: 4 }}
        >
          {showGrid && <CartesianGrid {...GRID_STYLE} />}
          <XAxis
            axisLine={{ stroke: "hsl(var(--border))" }}
            dataKey={xKey}
            tick={AXIS_STYLE}
            tickFormatter={formatChartLabel}
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
            formatter={formatChartValue}
            labelFormatter={formatChartLabel}
          />
          {showLegend && <Legend wrapperStyle={{ fontSize: 11 }} />}
          {yKeys.map((key, i) => (
            <Bar
              dataKey={key}
              fill={colors[i]}
              key={key}
              maxBarSize={48}
              name={key}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
