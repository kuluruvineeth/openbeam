import { z } from "zod";
import { ExecutionStatusSchema } from "./execution";

export const TimelineStepStatusSchema = z.enum([
  "pending",
  "queued",
  "running",
  "success",
  "error",
  "skipped",
  "cancelled",
]);

export type TimelineStepStatus = z.infer<typeof TimelineStepStatusSchema>;

export const TimelineStepSchema = z.object({
  id: z.string(),
  nodeId: z.string(),
  nodeType: z.string(),
  nodeName: z.string(),
  status: TimelineStepStatusSchema,
  startedAt: z.number().optional(),
  completedAt: z.number().optional(),
  durationMs: z.number().optional(),
  error: z.string().optional(),
  input: z.unknown().optional(),
  output: z.unknown().optional(),
  tokenUsage: z
    .object({
      input: z.number(),
      output: z.number(),
    })
    .optional(),
  retryCount: z.number().default(0),
  attempt: z.number().default(1),
  parentStepId: z.string().optional(),
  depth: z.number().default(0),
});

export type TimelineStep = z.infer<typeof TimelineStepSchema>;

export const TimelineEventTypeSchema = z.enum([
  "step_started",
  "step_completed",
  "step_failed",
  "step_skipped",
  "step_retrying",
  "execution_started",
  "execution_completed",
  "execution_failed",
  "execution_cancelled",
  "approval_requested",
  "approval_received",
  "input_requested",
  "input_received",
]);

export type TimelineEventType = z.infer<typeof TimelineEventTypeSchema>;

export const TimelineEventSchema = z.object({
  id: z.string(),
  type: TimelineEventTypeSchema,
  timestamp: z.number(),
  stepId: z.string().optional(),
  nodeId: z.string().optional(),
  message: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type TimelineEvent = z.infer<typeof TimelineEventSchema>;

export const TimelineDataSchema = z.object({
  executionId: z.string(),
  status: ExecutionStatusSchema,
  steps: z.array(TimelineStepSchema),
  events: z.array(TimelineEventSchema),
  startedAt: z.number(),
  completedAt: z.number().optional(),
  totalDurationMs: z.number().optional(),
  progress: z.object({
    completed: z.number(),
    total: z.number(),
    percentage: z.number(),
  }),
});

export type TimelineData = z.infer<typeof TimelineDataSchema>;

export const TimelineViewModeSchema = z.enum([
  "list",
  "gantt",
  "waterfall",
  "graph",
]);

export type TimelineViewMode = z.infer<typeof TimelineViewModeSchema>;

export const TimelineFilterSchema = z.object({
  status: z.array(TimelineStepStatusSchema).optional(),
  nodeTypes: z.array(z.string()).optional(),
  search: z.string().optional(),
  showSkipped: z.boolean().default(true),
  showRetries: z.boolean().default(false),
});

export type TimelineFilter = z.infer<typeof TimelineFilterSchema>;

export const TimelineSortSchema = z.object({
  field: z.enum(["startedAt", "completedAt", "durationMs", "nodeName"]),
  direction: z.enum(["asc", "desc"]),
});

export type TimelineSort = z.infer<typeof TimelineSortSchema>;
