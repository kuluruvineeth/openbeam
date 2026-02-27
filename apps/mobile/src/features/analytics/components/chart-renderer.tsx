import type { ChartConfig, ChartData, ChartType, MetricConfig } from "../types";
import { ChartEmpty } from "./chart-empty";
import { BarChartView } from "./chart-types/bar-chart";
import { FunnelChartView } from "./chart-types/funnel-chart";
import { LineChartView } from "./chart-types/line-chart";
import { MetricCard } from "./chart-types/metric-card";
import { PieChartView } from "./chart-types/pie-chart";
import { ScatterChartView } from "./chart-types/scatter-chart";

type ChartRendererProps = {
  type: ChartType;
  data: ChartData;
  config: ChartConfig;
  metricConfig?: MetricConfig;
  compact?: boolean;
};

export function ChartRenderer({
  type,
  data,
  config,
  metricConfig,
  compact,
}: ChartRendererProps) {
  if (type === "metric" && metricConfig) {
    return <MetricCard config={metricConfig} />;
  }

  if (data.length === 0) {
    return <ChartEmpty compact={compact} />;
  }

  const chartProps = { data, config, compact };

  switch (type) {
    case "line":
    case "area":
      return <LineChartView {...chartProps} />;
    case "bar":
      return <BarChartView {...chartProps} />;
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
