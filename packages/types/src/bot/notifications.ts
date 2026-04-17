import { z } from "zod";

export const NotificationFrequencySchema = z.enum([
  "IMMEDIATE",
  "HOURLY",
  "DAILY",
  "WEEKLY",
  "OFF",
]);
export type NotificationFrequency = z.infer<typeof NotificationFrequencySchema>;

export const NotificationPrioritySchema = z.enum([
  "CRITICAL",
  "HIGH",
  "NORMAL",
  "LOW",
]);
export type NotificationPriority = z.infer<typeof NotificationPrioritySchema>;

export const NotificationEventTypeSchema = z.enum([
  "connector.sync.completed",
  "connector.sync.failed",
  "connector.sync.stalled",
  "connector.health.degraded",
  "connector.health.restored",
  "connector.auth.expired",
  "connector.new_available",
  "document.mention",
  "document.shared_with_you",
  "search.trending",
  "search.saved_alert",
  "team.new_connector",
  "team.member_joined",
  "agent.task_completed",
  "agent.approval_required",
  "computer.run_completed",
  "computer.run_failed",
  "computer.proposal_pending",
  "digest.ready",
]);
export type NotificationEventType = z.infer<typeof NotificationEventTypeSchema>;

export const PRIORITY_BY_EVENT: Record<
  NotificationEventType,
  NotificationPriority
> = {
  "connector.auth.expired": "CRITICAL",
  "connector.sync.failed": "HIGH",
  "connector.health.degraded": "HIGH",
  "connector.sync.stalled": "HIGH",
  "agent.approval_required": "HIGH",
  "document.mention": "HIGH",
  "connector.health.restored": "NORMAL",
  "connector.sync.completed": "NORMAL",
  "document.shared_with_you": "NORMAL",
  "search.saved_alert": "NORMAL",
  "agent.task_completed": "NORMAL",
  "computer.run_completed": "NORMAL",
  "computer.run_failed": "HIGH",
  "computer.proposal_pending": "HIGH",
  "digest.ready": "NORMAL",
  "connector.new_available": "LOW",
  "search.trending": "LOW",
  "team.new_connector": "LOW",
  "team.member_joined": "LOW",
};

export const DEDUP_WINDOW_SECONDS: Partial<
  Record<NotificationEventType, number>
> = {
  "connector.sync.completed": 300,
  "connector.sync.failed": 1800,
  "connector.health.degraded": 1800,
  "connector.health.restored": 300,
  "document.mention": 300,
  "connector.new_available": 86_400,
  "search.trending": 86_400,
  "team.new_connector": 86_400,
  "team.member_joined": 86_400,
  "computer.run_completed": 300,
  "computer.run_failed": 600,
};

export const NotificationEventPayloadSchema = z.object({
  teamId: z.string(),
  userId: z.string().optional(),
  eventType: NotificationEventTypeSchema,
  priority: NotificationPrioritySchema,
  payload: z.record(z.string(), z.unknown()),
  connectorId: z.string().optional(),
  dedupKey: z.string().optional(),
});
export type NotificationEventPayload = z.infer<
  typeof NotificationEventPayloadSchema
>;

export const ThrottleDecisionSchema = z.object({
  action: z.enum(["deliver", "queue_digest", "suppress"]),
  reason: z.string().optional(),
});
export type ThrottleDecision = z.infer<typeof ThrottleDecisionSchema>;
