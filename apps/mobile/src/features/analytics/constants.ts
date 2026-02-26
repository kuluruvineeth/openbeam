export const CHART_PALETTE = [
  "#2563eb",
  "#60a5fa",
  "#22c55e",
  "#f59e0b",
  "#c084fc",
  "#fb923c",
  "#14b8a6",
  "#f43f5e",
  "#a78bfa",
  "#38bdf8",
];

export const DEFAULT_CHART_HEIGHT = 240;
export const COMPACT_CHART_HEIGHT = 160;

export const CHART_TYPE_OPTIONS: Array<{
  type: import("./types").ChartType;
  label: string;
}> = [
  { type: "line", label: "Line" },
  { type: "bar", label: "Bar" },
  { type: "area", label: "Area" },
  { type: "pie", label: "Pie" },
  { type: "donut", label: "Donut" },
  { type: "funnel", label: "Funnel" },
  { type: "scatter", label: "Scatter" },
  { type: "metric", label: "Metric" },
];
