import { z } from "zod";
import { ExecutionStatusSchema } from "./execution";
import { TimelineStepStatusSchema, TimelineViewModeSchema } from "./timeline";

export const ExecutionPanelTabSchema = z.enum([
  "timeline",
  "logs",
  "input",
  "output",
  "variables",
  "approvals",
]);

export type ExecutionPanelTab = z.infer<typeof ExecutionPanelTabSchema>;

export const ExecutionPanelStateSchema = z.object({
  isOpen: z.boolean(),
  activeTab: ExecutionPanelTabSchema,
  selectedStepId: z.string().optional(),
  timelineViewMode: TimelineViewModeSchema,
  isDetailExpanded: z.boolean(),
  scrollPosition: z.number().default(0),
});

export type ExecutionPanelState = z.infer<typeof ExecutionPanelStateSchema>;

export const NodeExecutionOverlaySchema = z.object({
  nodeId: z.string(),
  status: TimelineStepStatusSchema,
  progress: z.number().optional(),
  durationMs: z.number().optional(),
  error: z.string().optional(),
  isActive: z.boolean(),
  attempt: z.number().default(1),
});

export type NodeExecutionOverlay = z.infer<typeof NodeExecutionOverlaySchema>;

export const ExecutionListItemSchema = z.object({
  id: z.string(),
  agentCanvasId: z.string(),
  agentCanvasName: z.string(),
  versionNumber: z.number(),
  status: ExecutionStatusSchema,
  triggeredById: z.string(),
  triggeredByName: z.string().optional(),
  triggerSource: z.string().optional(),
  stepsCompleted: z.number(),
  stepsTotal: z.number(),
  durationMs: z.number().optional(),
  tokenUsage: z
    .object({
      input: z.number(),
      output: z.number(),
    })
    .optional(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  createdAt: z.string(),
  error: z.string().optional(),
});

export type ExecutionListItem = z.infer<typeof ExecutionListItemSchema>;

export const ExecutionHistoryFilterSchema = z.object({
  status: z.array(ExecutionStatusSchema).optional(),
  triggeredById: z.string().optional(),
  agentCanvasId: z.string().optional(),
  dateRange: z
    .object({
      start: z.string().optional(),
      end: z.string().optional(),
    })
    .optional(),
  search: z.string().optional(),
});

export type ExecutionHistoryFilter = z.infer<
  typeof ExecutionHistoryFilterSchema
>;

export const ExecutionHistorySortSchema = z.object({
  field: z.enum([
    "createdAt",
    "startedAt",
    "completedAt",
    "durationMs",
    "status",
  ]),
  direction: z.enum(["asc", "desc"]),
});

export type ExecutionHistorySort = z.infer<typeof ExecutionHistorySortSchema>;

export const StepDetailSchema = z.object({
  id: z.string(),
  nodeId: z.string(),
  nodeType: z.string(),
  nodeName: z.string(),
  status: TimelineStepStatusSchema,
  input: z.unknown().optional(),
  output: z.unknown().optional(),
  error: z.string().optional(),
  stackTrace: z.string().optional(),
  logs: z
    .array(
      z.object({
        timestamp: z.number(),
        level: z.enum(["debug", "info", "warn", "error"]),
        message: z.string(),
      })
    )
    .optional(),
  tokenUsage: z
    .object({
      input: z.number(),
      output: z.number(),
    })
    .optional(),
  retryHistory: z
    .array(
      z.object({
        attempt: z.number(),
        startedAt: z.number(),
        completedAt: z.number().optional(),
        error: z.string().optional(),
      })
    )
    .optional(),
  startedAt: z.number().optional(),
  completedAt: z.number().optional(),
  durationMs: z.number().optional(),
});

export type StepDetail = z.infer<typeof StepDetailSchema>;

export const ExecutionReplayStateSchema = z.object({
  isReplaying: z.boolean(),
  currentStepIndex: z.number(),
  playbackSpeed: z.number(),
  isPaused: z.boolean(),
});

export type ExecutionReplayState = z.infer<typeof ExecutionReplayStateSchema>;
