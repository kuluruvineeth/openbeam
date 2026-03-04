import { z } from "zod";

export const OutboundEventPrioritySchema = z.enum([
  "critical",
  "high",
  "normal",
  "low",
]);

export type OutboundEventPriority = z.infer<typeof OutboundEventPrioritySchema>;

export const OutboundEventStatusSchema = z.enum([
  "queued",
  "sending",
  "sent",
  "failed",
  "expired",
]);

export type OutboundEventStatus = z.infer<typeof OutboundEventStatusSchema>;

export const OutboundEventSchema = z.object({
  id: z.string(),
  type: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
  priority: OutboundEventPrioritySchema.default("normal"),
  status: OutboundEventStatusSchema.default("queued"),
  attempts: z.number().int().nonnegative().default(0),
  maxAttempts: z.number().int().positive().default(5),
  sizeBytes: z.number().int().nonnegative(),
  createdAt: z.number(),
  scheduledAt: z.number().optional(),
  sentAt: z.number().optional(),
  expiresAt: z.number().optional(),
  lastError: z.string().optional(),
});

export type OutboundEvent = z.infer<typeof OutboundEventSchema>;

export const QueueStatsSchema = z.object({
  totalEvents: z.number().int().nonnegative(),
  pendingEvents: z.number().int().nonnegative(),
  failedEvents: z.number().int().nonnegative(),
  totalSizeBytes: z.number().int().nonnegative(),
  maxSizeBytes: z.number().int().positive(),
  oldestEventAt: z.number().optional(),
});

export type QueueStats = z.infer<typeof QueueStatsSchema>;
