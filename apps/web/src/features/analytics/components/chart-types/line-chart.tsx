"use client";

import { cn } from "@openbeam/ui";
import {
  Area,
  CartesianGrid,
  Legend,
  Line,
  AreaChart as RechartsAreaChart,
  LineChart as RechartsLineChart,
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

type LineChartProps = {
  data: ChartData;
  config: ChartConfig;
  compact?: boolean;
  className?: string;
  isArea?: boolean;
};

export function LineChartView({
  data,
  config,
  compact,
  className,
  isArea,
}: LineChartProps) {
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

  const ChartContainer = isArea ? RechartsAreaChart : RechartsLineChart;

  const sharedAxisProps = {
    xAxis: {
      axisLine: { stroke: "hsl(var(--border))" },
      dataKey: xKey,
      tick: AXIS_STYLE,
      tickFormatter: formatChartLabel,
      tickLine: false,
    },
    yAxis: {
      axisLine: false as const,
      tick: AXIS_STYLE,
      tickFormatter: formatChartValue,
      tickLine: false,
      width: 48,
    },
    tooltip: {
      contentStyle: {
        background: "hsl(var(--background))",
        border: "1px solid hsl(var(--border))",
        borderRadius: 6,
        fontSize: 12,
      },
      formatter: formatChartValue,
      labelFormatter: formatChartLabel,
    },
  };

  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer height={height} width="100%">
        <ChartContainer
          data={processed}
          margin={{ top: 8, right: 16, left: 0, bottom: 4 }}
        >
          {showGrid && <CartesianGrid {...GRID_STYLE} />}
          <XAxis {...sharedAxisProps.xAxis} />
          <YAxis {...sharedAxisProps.yAxis} />
          <Tooltip {...sharedAxisProps.tooltip} />
          {showLegend && <Legend wrapperStyle={{ fontSize: 11 }} />}
          {yKeys.map((key, i) =>
            isArea ? (
              <Area
                dataKey={key}
                fill={colors[i]}
                fillOpacity={0.15}
                key={key}
                name={key}
                stroke={colors[i]}
                strokeWidth={2}
                type="monotone"
              />
            ) : (
              <Line
                activeDot={{ r: 5 }}
                dataKey={key}
                dot={{ r: 3, fill: colors[i] }}
                key={key}
                name={key}
                stroke={colors[i]}
                strokeWidth={2}
              />
            )
          )}
        </ChartContainer>
      </ResponsiveContainer>
    </div>
  );
}
