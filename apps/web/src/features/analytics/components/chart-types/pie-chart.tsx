"use client";

import { cn } from "@openbeam/ui";
import {
  Cell,
  Legend,
  Pie,
  type PieLabelRenderProps,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { COMPACT_CHART_HEIGHT, DEFAULT_CHART_HEIGHT } from "../../constants";
import {
  coerceNumericData,
  formatChartLabel,
  formatChartValue,
  resolveColors,
} from "../../lib/chart-utils";
import type { ChartConfig, ChartData, ChartType } from "../../types";
import { ChartEmpty } from "../chart-empty";

type PieChartProps = {
  data: ChartData;
  config: ChartConfig;
  type?: Extract<ChartType, "pie" | "donut">;
  compact?: boolean;
  className?: string;
};

export function PieChartView({
  data,
  config,
  type = "pie",
  compact,
  className,
}: PieChartProps) {
  const processed = coerceNumericData(data, config);
  if (processed.length === 0) {
    return <ChartEmpty size={compact ? "compact" : "default"} />;
  }

  const nameKey =
    config.nameKey ?? Object.keys(processed[0] ?? {})[0] ?? "name";
  const valueKey =
    config.valueKey ?? Object.keys(processed[0] ?? {})[1] ?? "value";
  const colors = resolveColors(config, processed.length);
  const height =
    config.height ?? (compact ? COMPACT_CHART_HEIGHT : DEFAULT_CHART_HEIGHT);
  const innerRadius = type === "donut" ? "50%" : 0;
  const outerRadius = compact ? 70 : 110;
  const showLegend = config.showLegend !== false && !compact;

  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer height={height} width="100%">
        <RechartsPieChart>
          <Pie
            cx="50%"
            cy="50%"
            data={processed}
            dataKey={valueKey}
            innerRadius={innerRadius}
            label={
              compact
                ? undefined
                : (props: PieLabelRenderProps) => {
                    const { name, percent = 0 } = props;
                    return `${formatChartLabel(name)} ${(percent * 100).toFixed(0)}%`;
                  }
            }
            labelLine={!compact}
            nameKey={nameKey}
            outerRadius={outerRadius}
            paddingAngle={2}
            style={{ fontSize: 11 }}
          >
            {processed.map((_, i) => (
              <Cell fill={colors[i]} key={`cell-${i}`} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 6,
              fontSize: 12,
            }}
            formatter={formatChartValue}
          />
          {showLegend && <Legend wrapperStyle={{ fontSize: 11 }} />}
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
}
