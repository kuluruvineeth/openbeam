import { z } from "zod";

export type HexColor = `#${string}`;
export type Theme = "light" | "dark" | "default";

export const NodeTypeSchema = z.enum([
  "start",
  "end",
  "condition",
  "loop",
  "parallel_split",
  "parallel_join",
  "llm",
  "rag",
  "summarize",
  "extract",
  "classify",
  "transform",
  "filter",
  "template",
  "code",
  "approval",
  "input",
  "notify",
  "annotation",
  "connector",
  "tool",
]);

export type NodeType = z.infer<typeof NodeTypeSchema>;

export const ConnectorCategorySchema = z.enum([
  "Communication",
  "Productivity",
  "Development",
  "Storage",
  "CRM",
  "Analytics",
  "Other",
]);

export type ConnectorCategory = z.infer<typeof ConnectorCategorySchema>;

export const EdgeColorTypeSchema = z.enum([
  "data",
  "control",
  "conditional",
  "error",
]);

export type EdgeColorType = z.infer<typeof EdgeColorTypeSchema>;

export const DataTypeSchema = z.enum([
  "string",
  "number",
  "boolean",
  "object",
  "array",
  "any",
]);

export type DataType = z.infer<typeof DataTypeSchema>;

export const ExecutionStateSchema = z.enum([
  "idle",
  "running",
  "success",
  "error",
  "waiting",
  "skipped",
]);

export type ExecutionState = z.infer<typeof ExecutionStateSchema>;

type ThemedColor = {
  default: HexColor;
  light?: HexColor;
  dark?: HexColor;
};

export const DEFAULT_NODE_COLORS: Record<NodeType, ThemedColor> = {
  start: { default: "#22c55e", light: "#16a34a", dark: "#4ade80" },
  end: { default: "#ef4444", light: "#dc2626", dark: "#f87171" },
  condition: { default: "#f59e0b", light: "#d97706", dark: "#fbbf24" },
  loop: { default: "#8b5cf6", light: "#7c3aed", dark: "#a78bfa" },
  parallel_split: { default: "#06b6d4", light: "#0891b2", dark: "#22d3ee" },
  parallel_join: { default: "#06b6d4", light: "#0891b2", dark: "#22d3ee" },
  llm: { default: "#3b82f6", light: "#2563eb", dark: "#60a5fa" },
  rag: { default: "#6366f1", light: "#4f46e5", dark: "#818cf8" },
  summarize: { default: "#8b5cf6", light: "#7c3aed", dark: "#a78bfa" },
  extract: { default: "#ec4899", light: "#db2777", dark: "#f472b6" },
  classify: { default: "#14b8a6", light: "#0d9488", dark: "#2dd4bf" },
  transform: { default: "#f97316", light: "#ea580c", dark: "#fb923c" },
  filter: { default: "#eab308", light: "#ca8a04", dark: "#facc15" },
  template: { default: "#84cc16", light: "#65a30d", dark: "#a3e635" },
  code: { default: "#64748b", light: "#475569", dark: "#94a3b8" },
  approval: { default: "#f43f5e", light: "#e11d48", dark: "#fb7185" },
  input: { default: "#0ea5e9", light: "#0284c7", dark: "#38bdf8" },
  notify: { default: "#a855f7", light: "#9333ea", dark: "#c084fc" },
  annotation: { default: "#f59e0b", light: "#d97706", dark: "#fbbf24" },
  connector: { default: "#10b981", light: "#059669", dark: "#34d399" },
  tool: { default: "#6366f1", light: "#4f46e5", dark: "#818cf8" },
};

export const DEFAULT_CONNECTOR_CATEGORY_COLORS: Record<
  ConnectorCategory,
  ThemedColor
> = {
  Communication: { default: "#3b82f6", light: "#2563eb", dark: "#60a5fa" },
  Productivity: { default: "#22c55e", light: "#16a34a", dark: "#4ade80" },
  Development: { default: "#64748b", light: "#475569", dark: "#94a3b8" },
  Storage: { default: "#f59e0b", light: "#d97706", dark: "#fbbf24" },
  CRM: { default: "#ec4899", light: "#db2777", dark: "#f472b6" },
  Analytics: { default: "#8b5cf6", light: "#7c3aed", dark: "#a78bfa" },
  Other: { default: "#6b7280", light: "#4b5563", dark: "#9ca3af" },
};

export const DEFAULT_EDGE_COLORS: Record<EdgeColorType, ThemedColor> = {
  data: { default: "#6b7280", light: "#4b5563", dark: "#9ca3af" },
  control: { default: "#3b82f6", light: "#2563eb", dark: "#60a5fa" },
  conditional: { default: "#f59e0b", light: "#d97706", dark: "#fbbf24" },
  error: { default: "#ef4444", light: "#dc2626", dark: "#f87171" },
};

export const DEFAULT_DATA_TYPE_COLORS: Record<DataType, ThemedColor> = {
  string: { default: "#22c55e", light: "#16a34a", dark: "#4ade80" },
  number: { default: "#3b82f6", light: "#2563eb", dark: "#60a5fa" },
  boolean: { default: "#f59e0b", light: "#d97706", dark: "#fbbf24" },
  object: { default: "#8b5cf6", light: "#7c3aed", dark: "#a78bfa" },
  array: { default: "#06b6d4", light: "#0891b2", dark: "#22d3ee" },
  any: { default: "#6b7280", light: "#4b5563", dark: "#9ca3af" },
};

export const DEFAULT_EXECUTION_STATE_COLORS: Record<
  ExecutionState,
  ThemedColor
> = {
  idle: { default: "#6b7280", light: "#4b5563", dark: "#9ca3af" },
  running: { default: "#3b82f6", light: "#2563eb", dark: "#60a5fa" },
  success: { default: "#22c55e", light: "#16a34a", dark: "#4ade80" },
  error: { default: "#ef4444", light: "#dc2626", dark: "#f87171" },
  waiting: { default: "#f59e0b", light: "#d97706", dark: "#fbbf24" },
  skipped: { default: "#6b7280", light: "#4b5563", dark: "#9ca3af" },
};

export const CanvasColorsPreferencesSchema = z.object({
  nodeColors: z.record(NodeTypeSchema, z.string()).optional(),
  connectorCategoryColors: z
    .record(ConnectorCategorySchema, z.string())
    .optional(),
  edgeColors: z.record(EdgeColorTypeSchema, z.string()).optional(),
  dataTypeColors: z.record(DataTypeSchema, z.string()).optional(),
  executionStateColors: z.record(ExecutionStateSchema, z.string()).optional(),
});

export type CanvasColorsPreferences = z.infer<
  typeof CanvasColorsPreferencesSchema
>;

export function getNodeColor(
  nodeType: NodeType,
  preferences?: CanvasColorsPreferences,
  theme: Theme = "default"
): HexColor {
  if (preferences?.nodeColors?.[nodeType]) {
    return preferences.nodeColors[nodeType] as HexColor;
  }

  const colorConfig = DEFAULT_NODE_COLORS[nodeType];
  return (colorConfig[theme] ?? colorConfig.default) as HexColor;
}

export function getConnectorCategoryColor(
  category: ConnectorCategory,
  preferences?: CanvasColorsPreferences,
  theme: Theme = "default"
): HexColor {
  if (preferences?.connectorCategoryColors?.[category]) {
    return preferences.connectorCategoryColors[category] as HexColor;
  }

  const colorConfig =
    DEFAULT_CONNECTOR_CATEGORY_COLORS[category] ??
    DEFAULT_CONNECTOR_CATEGORY_COLORS.Other;
  return (colorConfig[theme] ?? colorConfig.default) as HexColor;
}

export function getEdgeColor(
  edgeType: EdgeColorType,
  preferences?: CanvasColorsPreferences,
  theme: Theme = "default"
): HexColor {
  if (preferences?.edgeColors?.[edgeType]) {
    return preferences.edgeColors[edgeType] as HexColor;
  }

  const colorConfig = DEFAULT_EDGE_COLORS[edgeType];
  return (colorConfig[theme] ?? colorConfig.default) as HexColor;
}

export function getDataTypeColor(
  dataType: DataType,
  preferences?: CanvasColorsPreferences,
  theme: Theme = "default"
): HexColor {
  if (preferences?.dataTypeColors?.[dataType]) {
    return preferences.dataTypeColors[dataType] as HexColor;
  }

  const colorConfig =
    DEFAULT_DATA_TYPE_COLORS[dataType] ?? DEFAULT_DATA_TYPE_COLORS.any;
  return (colorConfig[theme] ?? colorConfig.default) as HexColor;
}

export function getExecutionStateColor(
  state: ExecutionState,
  preferences?: CanvasColorsPreferences,
  theme: Theme = "default"
): HexColor {
  if (preferences?.executionStateColors?.[state]) {
    return preferences.executionStateColors[state] as HexColor;
  }

  const colorConfig =
    DEFAULT_EXECUTION_STATE_COLORS[state] ??
    DEFAULT_EXECUTION_STATE_COLORS.idle;
  return (colorConfig[theme] ?? colorConfig.default) as HexColor;
}

export function getAllNodeColors(
  preferences?: CanvasColorsPreferences,
  theme: Theme = "default"
): Record<NodeType, HexColor> {
  return Object.fromEntries(
    NodeTypeSchema.options.map((nodeType) => [
      nodeType,
      getNodeColor(nodeType, preferences, theme),
    ])
  ) as Record<NodeType, HexColor>;
}

export function getAllConnectorCategoryColors(
  preferences?: CanvasColorsPreferences,
  theme: Theme = "default"
): Record<ConnectorCategory, HexColor> {
  return Object.fromEntries(
    ConnectorCategorySchema.options.map((category) => [
      category,
      getConnectorCategoryColor(category, preferences, theme),
    ])
  ) as Record<ConnectorCategory, HexColor>;
}

export function getAllDataTypeColors(
  preferences?: CanvasColorsPreferences,
  theme: Theme = "default"
): Record<DataType, HexColor> {
  return Object.fromEntries(
    DataTypeSchema.options.map((dataType) => [
      dataType,
      getDataTypeColor(dataType, preferences, theme),
    ])
  ) as Record<DataType, HexColor>;
}

export function getAllExecutionStateColors(
  preferences?: CanvasColorsPreferences,
  theme: Theme = "default"
): Record<ExecutionState, HexColor> {
  return Object.fromEntries(
    ExecutionStateSchema.options.map((state) => [
      state,
      getExecutionStateColor(state, preferences, theme),
    ])
  ) as Record<ExecutionState, HexColor>;
}
