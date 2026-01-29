import { z } from "zod";
import { ToolCategorySchema } from "../common/errors";
import { AgentCanvasEdgeSchema } from "./edges";
import { AgentCanvasNodeSchema } from "./nodes";

export const ViewportSchema = z.object({
  x: z.number(),
  y: z.number(),
  zoom: z.number(),
});

export type Viewport = z.infer<typeof ViewportSchema>;

export const CanvasStateSchema = z.object({
  nodes: z.array(AgentCanvasNodeSchema),
  edges: z.array(AgentCanvasEdgeSchema),
  viewport: ViewportSchema.optional(),
});

export type CanvasState = z.infer<typeof CanvasStateSchema>;

export const SelectionStateSchema = z.object({
  nodes: z.array(z.string()),
  edges: z.array(z.string()),
});

export type SelectionState = z.infer<typeof SelectionStateSchema>;

export const AgentConfigSchema = z.object({
  model: z.string(),
  capabilities: z.array(ToolCategorySchema),
  systemPrompt: z.string().optional(),
});

export type AgentConfig = z.infer<typeof AgentConfigSchema>;

export const AgentCanvasSettingsSchema = z.object({
  autoSave: z.boolean().default(true),
  theme: z.enum(["light", "dark", "system"]).default("system"),
  snapToGrid: z.boolean().default(true),
  gridSize: z.number().default(20),
  maxExecutionTime: z.number().default(300_000),
  enableLogging: z.boolean().default(true),
  environment: z.record(z.string(), z.string()).optional(),
  agentConfig: AgentConfigSchema.optional(),
});

export type AgentCanvasSettings = z.infer<typeof AgentCanvasSettingsSchema>;

export const CanvasTriggerSettingsSchema = z.object({
  webhookUrl: z.url().optional(),
  webhookSecret: z.string().optional(),
  schedule: z.string().optional(),
  eventType: z.string().optional(),
  eventFilter: z.record(z.string(), z.unknown()).optional(),
});

export type CanvasTriggerSettings = z.infer<typeof CanvasTriggerSettingsSchema>;
