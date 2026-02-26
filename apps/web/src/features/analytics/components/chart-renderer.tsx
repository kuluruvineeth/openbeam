"use client";

import dynamic from "next/dynamic";
import type { ChartConfig, ChartData, ChartType, MetricConfig } from "../types";
import { ChartEmpty } from "./chart-empty";

const chartLoading = () => <ChartEmpty state="loading" />;

const BarChartView = dynamic(
  () => import("./chart-types/bar-chart").then((mod) => mod.BarChartView),
  { ssr: false, loading: chartLoading }
);
const FunnelChartView = dynamic(
  () => import("./chart-types/funnel-chart").then((mod) => mod.FunnelChartView),
  { ssr: false, loading: chartLoading }
);
const LineChartView = dynamic(
  () => import("./chart-types/line-chart").then((mod) => mod.LineChartView),
  { ssr: false, loading: chartLoading }
);
const MetricCard = dynamic(
  () => import("./chart-types/metric-card").then((mod) => mod.MetricCard),
  { ssr: false, loading: chartLoading }
);
const PieChartView = dynamic(
  () => import("./chart-types/pie-chart").then((mod) => mod.PieChartView),
  { ssr: false, loading: chartLoading }
);
const ScatterChartView = dynamic(
  () =>
    import("./chart-types/scatter-chart").then((mod) => mod.ScatterChartView),
  { ssr: false, loading: chartLoading }
);

type ChartRendererProps = {
  type: ChartType;
  data: ChartData;
  config: ChartConfig;
  metricConfig?: MetricConfig;
  compact?: boolean;
  className?: string;
};

export function ChartRenderer({
  type,
  data,
  config,
  metricConfig,
  compact,
  className,
}: ChartRendererProps) {
  if (type === "metric") {
    if (!metricConfig) {
      return (
        <ChartEmpty
          className={className}
          size={compact ? "compact" : "default"}
          state="error"
        />
      );
    }
    return <MetricCard className={className} config={metricConfig} />;
  }

  if (data.length === 0) {
    return (
      <ChartEmpty
        className={className}
        size={compact ? "compact" : "default"}
      />
    );
  }

  const chartProps = { data, config, compact, className };

  switch (type) {
    case "line":
      return <LineChartView {...chartProps} />;
    case "bar":
      return <BarChartView {...chartProps} />;
    case "area":
      return <LineChartView {...chartProps} isArea />;
    case "pie":
      return <PieChartView {...chartProps} type="pie" />;
    case "donut":
      return <PieChartView {...chartProps} type="donut" />;
    case "funnel":
      return <FunnelChartView {...chartProps} />;
    case "scatter":
      return <ScatterChartView {...chartProps} />;
    default:
      return <BarChartView {...chartProps} />;
  }
}
