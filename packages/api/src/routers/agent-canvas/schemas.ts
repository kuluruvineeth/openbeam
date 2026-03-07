import {
  AgentCanvasEdgeSchema,
  AgentCanvasNodeSchema,
  AgentCanvasSettingsSchema,
  CanvasTriggerSettingsSchema,
  ViewportSchema,
} from "@openbeam/types/canvas";
import {
  ArchiveSessionInputSchema,
  BuildCanvasInputSchema,
  CreateSessionInputSchema,
  GetOrCreateSessionInputSchema,
  GetSessionEventsInputSchema,
  ListSessionsInputSchema,
  OnSessionEventInputSchema,
} from "@openbeam/types/canvas/session";
import { z } from "zod";

export const EXECUTIONS_PER_HOUR = 100;
export const BUILDS_PER_HOUR = 200;
export const ONE_HOUR_SECONDS = 3600;

const CANVAS_STREAM_DEBUG_VALUES = new Set(["1", "true", "yes", "on"]);
export const CANVAS_STREAM_DEBUG = CANVAS_STREAM_DEBUG_VALUES.has(
  (process.env.CANVAS_STREAM_DEBUG ?? "").toLowerCase()
);

export const AgentCanvasStatusSchema = z.enum([
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
]);

export const AgentTriggerTypeSchema = z.enum([
  "MANUAL",
  "SCHEDULE",
  "WEBHOOK",
  "EVENT",
]);

export const listCanvasesSchema = z.object({
  status: AgentCanvasStatusSchema.optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  cursor: z.number().nullish(),
});

export const canvasIdSchema = z.object({
  canvasId: z.string(),
});

export const duplicateCanvasSchema = z.object({
  canvasId: z.string(),
  name: z.string().min(1).max(100).optional(),
});

export const createCanvasSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  icon: z.string().optional(),
  nodes: z.array(AgentCanvasNodeSchema),
  edges: z.array(AgentCanvasEdgeSchema),
  viewport: ViewportSchema.optional(),
  settings: AgentCanvasSettingsSchema.optional(),
  triggerType: AgentTriggerTypeSchema.optional(),
  triggerConfig: CanvasTriggerSettingsSchema.optional(),
});

export const updateCanvasSchema = z.object({
  canvasId: z.string(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  icon: z.string().optional(),
  nodes: z.array(AgentCanvasNodeSchema).optional(),
  edges: z.array(AgentCanvasEdgeSchema).optional(),
  viewport: ViewportSchema.optional(),
  settings: AgentCanvasSettingsSchema.optional(),
  triggerType: AgentTriggerTypeSchema.optional(),
  triggerConfig: CanvasTriggerSettingsSchema.optional(),
});

export const publishCanvasSchema = z.object({
  canvasId: z.string(),
  changelog: z.string().max(1000).optional(),
});

export const listExecutionsSchema = z.object({
  canvasId: z.string(),
  status: z
    .enum([
      "PENDING",
      "RUNNING",
      "WAITING_APPROVAL",
      "WAITING_INPUT",
      "COMPLETED",
      "FAILED",
      "CANCELLED",
      "TIMED_OUT",
    ])
    .optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

export const executionIdSchema = z.object({
  executionId: z.string(),
});

export const createExecutionSchema = z.object({
  canvasId: z.string(),
  input: z.record(z.string(), z.unknown()).optional(),
  triggerSource: z.string().optional(),
  sessionId: z.string().optional(),
  turnId: z.string().optional(),
});

export const approvalResponseSchema = z.object({
  approvalId: z.string(),
  status: z.enum(["APPROVED", "REJECTED"]),
  responseMessage: z.string().max(500).optional(),
  sessionId: z.string().optional(),
  canvasId: z.string().optional(),
});

export const pendingApprovalSchema = z.object({
  executionId: z.string(),
  nodeId: z.string(),
});

export const submitInputSchema = z.object({
  executionId: z.string(),
  nodeId: z.string(),
  values: z.record(z.string(), z.unknown()).optional(),
  skipped: z.boolean().optional(),
  sessionId: z.string().optional(),
});

export const listTemplatesSchema = z.object({
  category: z.string().optional(),
  isPublic: z.boolean().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

export const buildCanvasSchema = BuildCanvasInputSchema;

export {
  ArchiveSessionInputSchema,
  CreateSessionInputSchema,
  GetOrCreateSessionInputSchema,
  GetSessionEventsInputSchema,
  ListSessionsInputSchema,
  OnSessionEventInputSchema,
};
