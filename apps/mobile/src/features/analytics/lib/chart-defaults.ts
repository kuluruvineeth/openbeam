import type { ChartConfig, ChartType } from "../types";

const LINE_DEFAULTS: ChartConfig = {
  showLegend: true,
  showGrid: true,
  height: 240,
};

const BAR_DEFAULTS: ChartConfig = {
  showLegend: true,
  showGrid: true,
  height: 240,
};

const PIE_DEFAULTS: ChartConfig = {
  showLegend: true,
  showGrid: false,
  height: 240,
};

const FUNNEL_DEFAULTS: ChartConfig = {
  showLegend: false,
  showGrid: false,
  height: 240,
};

const SCATTER_DEFAULTS: ChartConfig = {
  showLegend: true,
  showGrid: true,
  height: 240,
};

const METRIC_DEFAULTS: ChartConfig = {
  showLegend: false,
  showGrid: false,
  height: 100,
};

const CHART_DEFAULTS: Record<ChartType, ChartConfig> = {
  line: LINE_DEFAULTS,
  bar: BAR_DEFAULTS,
  area: LINE_DEFAULTS,
  pie: PIE_DEFAULTS,
  donut: PIE_DEFAULTS,
  funnel: FUNNEL_DEFAULTS,
  scatter: SCATTER_DEFAULTS,
  metric: METRIC_DEFAULTS,
};

export function getChartDefaults(type: ChartType): ChartConfig {
  return CHART_DEFAULTS[type];
}

export function mergeWithDefaults(
  type: ChartType,
  config: ChartConfig
): ChartConfig {
  return { ...getChartDefaults(type), ...config };
}
