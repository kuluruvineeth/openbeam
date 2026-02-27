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

export const DEFAULT_CHART_HEIGHT = 320;
export const COMPACT_CHART_HEIGHT = 200;

export const AXIS_STYLE = {
  fontSize: 11,
  fill: "hsl(var(--muted-foreground))",
} as const;

export const GRID_STYLE = {
  stroke: "hsl(var(--border))",
  strokeDasharray: "3 3",
} as const;
