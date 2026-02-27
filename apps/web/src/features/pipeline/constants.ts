import type { PipelineColumn } from "./types";

export const DEFAULT_COLUMNS: PipelineColumn[] = [
  { id: "new", name: "New", color: "#60a5fa", sortOrder: 0 },
  { id: "contacted", name: "Contacted", color: "#f59e0b", sortOrder: 1 },
  { id: "qualified", name: "Qualified", color: "#a78bfa", sortOrder: 2 },
  { id: "won", name: "Won", color: "#22c55e", sortOrder: 3 },
  { id: "lost", name: "Lost", color: "#ef4444", sortOrder: 4 },
];

export const COLUMN_WIDTH = 280;
export const CARD_DRAG_ACTIVATION_DISTANCE = 5;
export const MAX_CARD_FIELDS_DISPLAYED = 3;

export const COLUMN_COLORS = [
  "#60a5fa",
  "#f59e0b",
  "#a78bfa",
  "#22c55e",
  "#ef4444",
  "#14b8a6",
  "#fb923c",
  "#f43f5e",
  "#38bdf8",
  "#c084fc",
];
