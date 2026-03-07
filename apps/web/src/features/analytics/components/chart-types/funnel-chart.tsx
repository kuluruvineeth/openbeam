"use client";

import { cn } from "@openbeam/ui";
import {
  Funnel,
  LabelList,
  FunnelChart as RechartsFunnelChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { COMPACT_CHART_HEIGHT, DEFAULT_CHART_HEIGHT } from "../../constants";
import {
  coerceNumericData,
  formatChartValue,
  resolveColors,
} from "../../lib/chart-utils";
import type { ChartConfig, ChartData } from "../../types";
import { ChartEmpty } from "../chart-empty";

type FunnelChartProps = {
  data: ChartData;
  config: ChartConfig;
  compact?: boolean;
  className?: string;
};

export function FunnelChartView({
  data,
  config,
  compact,
  className,
}: FunnelChartProps) {
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

  const funnelData = processed.map((row, i) => ({
    ...row,
    fill: colors[i],
  }));

  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer height={height} width="100%">
        <RechartsFunnelChart>
          <Tooltip
            contentStyle={{
              background: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 6,
              fontSize: 12,
            }}
            formatter={formatChartValue}
          />
          <Funnel
            data={funnelData}
            dataKey={valueKey}
            isAnimationActive
            nameKey={nameKey}
          >
            <LabelList
              dataKey={nameKey}
              fill="hsl(var(--muted-foreground))"
              fontSize={11}
              position="right"
              stroke="none"
            />
          </Funnel>
        </RechartsFunnelChart>
      </ResponsiveContainer>
    </div>
  );
}
