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

export const TEMPORAL_SIGNALS = {
  CANCEL: "cancel",
  PAUSE: "pause",
  RESUME: "resume",
  UPDATE_CONFIG: "updateConfig",
} as const;

export type TemporalSignalName =
  (typeof TEMPORAL_SIGNALS)[keyof typeof TEMPORAL_SIGNALS];
