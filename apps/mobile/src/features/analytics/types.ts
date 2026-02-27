export type ChartType =
  | "line"
  | "bar"
  | "area"
  | "pie"
  | "donut"
  | "funnel"
  | "scatter"
  | "metric";

export type ChartConfig = {
  xField?: string;
  yField?: string;
  yFields?: string[];
  groupBy?: string;
  nameKey?: string;
  valueKey?: string;
  title?: string;
  colors?: string[];
  showLegend?: boolean;
  showGrid?: boolean;
  height?: number;
};

export type ChartData = Record<string, unknown>[];

export type MetricTrend = "up" | "down" | "neutral";

export type MetricConfig = {
  title: string;
  value: number | string;
  previousValue?: number;
  format?: "number" | "currency" | "percent";
  trend?: MetricTrend;
  trendLabel?: string;
};

export type DashboardPanel = {
  id: string;
  type: ChartType;
  config: ChartConfig;
  data: ChartData;
  span?: number;
};

export type DashboardLayout = {
  id: string;
  title: string;
  panels: DashboardPanel[];
  refreshInterval?: number;
};
