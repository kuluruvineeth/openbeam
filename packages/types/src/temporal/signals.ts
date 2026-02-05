import { z } from "zod";

export const CancelSignalPayloadSchema = z.object({
  reason: z.string().optional(),
  cancelledBy: z.string().optional(),
  timestamp: z.number(),
});

export type CancelSignalPayload = z.infer<typeof CancelSignalPayloadSchema>;

export const UpdateConfigSignalPayloadSchema = z.object({
  config: z.record(z.string(), z.unknown()),
  updatedBy: z.string().optional(),
  timestamp: z.number(),
});

export type UpdateConfigSignalPayload = z.infer<
  typeof UpdateConfigSignalPayloadSchema
>;

export const PauseSignalPayloadSchema = z.object({
  pausedBy: z.string().optional(),
  timestamp: z.number(),
});

export type PauseSignalPayload = z.infer<typeof PauseSignalPayloadSchema>;

export const ResumeSignalPayloadSchema = z.object({
  resumedBy: z.string().optional(),
  timestamp: z.number(),
});

export type ResumeSignalPayload = z.infer<typeof ResumeSignalPayloadSchema>;

export const CanvasApprovalSignalPayloadSchema = z.object({
  approvalId: z.string(),
  nodeId: z.string(),
  status: z.enum(["APPROVED", "REJECTED"]),
  responseMessage: z.string().optional(),
  respondedById: z.string().optional(),
  executionId: z.string().optional(),
  timestamp: z.number(),
});

export type CanvasApprovalSignalPayload = z.infer<
  typeof CanvasApprovalSignalPayloadSchema
>;

export const CanvasInputSignalPayloadSchema = z.object({
  nodeId: z.string(),
  values: z.record(z.string(), z.unknown()).optional(),
  skipped: z.boolean().optional(),
  submittedById: z.string().optional(),
  executionId: z.string().optional(),
  timestamp: z.number(),
});

export type CanvasInputSignalPayload = z.infer<
  typeof CanvasInputSignalPayloadSchema
>;

export const TEMPORAL_SIGNALS = {
  CANCEL: "cancel",
  PAUSE: "pause",
  RESUME: "resume",
  UPDATE_CONFIG: "updateConfig",
  CANVAS_APPROVAL: "canvasApproval",
  CANVAS_INPUT: "canvasInput",
} as const;

export type TemporalSignalName =
  (typeof TEMPORAL_SIGNALS)[keyof typeof TEMPORAL_SIGNALS];
