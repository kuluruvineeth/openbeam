import { z } from "zod";

export const TriggerTypeSchema = z.enum([
  "manual",
  "schedule",
  "webhook",
  "event",
]);

export type TriggerType = z.infer<typeof TriggerTypeSchema>;

export const ManualTriggerConfigSchema = z.object({
  type: z.literal("manual"),
  inputSchema: z
    .array(
      z.object({
        name: z.string(),
        type: z.enum([
          "string",
          "number",
          "boolean",
          "array",
          "object",
          "file",
        ]),
        required: z.boolean().default(true),
        description: z.string().optional(),
        default: z.unknown().optional(),
      })
    )
    .optional(),
  requiredPermissions: z.array(z.string()).optional(),
});

export type ManualTriggerConfig = z.infer<typeof ManualTriggerConfigSchema>;

export const ScheduleTriggerConfigSchema = z.object({
  type: z.literal("schedule"),
  cron: z.string(),
  timezone: z.string().default("UTC"),
  enabled: z.boolean().default(true),
  startDate: z.iso.datetime().optional(),
  endDate: z.iso.datetime().optional(),
  maxRuns: z.number().positive().optional(),
  runOnStart: z.boolean().default(false),
  catchUpMissed: z.boolean().default(false),
});

export type ScheduleTriggerConfig = z.infer<typeof ScheduleTriggerConfigSchema>;

export const WebhookAuthTypeSchema = z.enum([
  "none",
  "bearer",
  "basic",
  "hmac",
  "api_key",
]);

export type WebhookAuthType = z.infer<typeof WebhookAuthTypeSchema>;

export const WebhookTriggerConfigSchema = z.object({
  type: z.literal("webhook"),
  path: z.string(),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("POST"),
  headers: z.record(z.string(), z.string()).optional(),
  authentication: WebhookAuthTypeSchema.default("none"),
  secret: z.string().optional(),
  signatureHeader: z.string().optional(),
  validationSchema: z.unknown().optional(),
  rateLimit: z
    .object({
      requests: z.number(),
      windowMs: z.number(),
    })
    .optional(),
  allowedIps: z.array(z.string()).optional(),
  respondWith: z
    .object({
      status: z.number().default(200),
      body: z.unknown().optional(),
      headers: z.record(z.string(), z.string()).optional(),
    })
    .optional(),
});

export type WebhookTriggerConfig = z.infer<typeof WebhookTriggerConfigSchema>;

export const EventSourceSchema = z.enum([
  "connector",
  "system",
  "custom",
  "workflow",
]);

export type EventSource = z.infer<typeof EventSourceSchema>;

export const EventTriggerConfigSchema = z.object({
  type: z.literal("event"),
  eventType: z.string(),
  eventSource: EventSourceSchema.default("system"),
  connectorType: z.string().optional(),
  filter: z.record(z.string(), z.unknown()).optional(),
  debounceMs: z.number().positive().optional(),
  batchSize: z.number().positive().optional(),
  batchWindowMs: z.number().positive().optional(),
});

export type EventTriggerConfig = z.infer<typeof EventTriggerConfigSchema>;

export const TriggerConfigSchema = z.discriminatedUnion("type", [
  ManualTriggerConfigSchema,
  ScheduleTriggerConfigSchema,
  WebhookTriggerConfigSchema,
  EventTriggerConfigSchema,
]);

export type TriggerConfig = z.infer<typeof TriggerConfigSchema>;

export const TriggerNodeDataSchema = z.object({
  label: z.string(),
  description: z.string().optional(),
  config: TriggerConfigSchema,
  enabled: z.boolean().default(true),
  lastTriggeredAt: z.iso.datetime().optional(),
  triggerCount: z.number().default(0),
});

export type TriggerNodeData = z.infer<typeof TriggerNodeDataSchema>;

export const TriggerExecutionMetadataSchema = z.object({
  source: z.string(),
  correlationId: z.string().optional(),
  headers: z.record(z.string(), z.string()).optional(),
});

export type TriggerExecutionMetadata = z.infer<
  typeof TriggerExecutionMetadataSchema
>;

export const TriggerExecutionContextSchema = z.object({
  triggerId: z.string(),
  triggerType: TriggerTypeSchema,
  workflowId: z.string(),
  timestamp: z.number(),
  payload: z.unknown(),
  metadata: TriggerExecutionMetadataSchema,
});

export type TriggerExecutionContext = z.infer<
  typeof TriggerExecutionContextSchema
>;

export const ScheduleNextRunSchema = z.object({
  scheduledAt: z.date(),
  cron: z.string(),
  timezone: z.string(),
});

export type ScheduleNextRun = z.infer<typeof ScheduleNextRunSchema>;

export const WebhookRegistrationSchema = z.object({
  id: z.string(),
  path: z.string(),
  method: z.string(),
  workflowId: z.string(),
  createdAt: z.date(),
  expiresAt: z.date().optional(),
});

export type WebhookRegistration = z.infer<typeof WebhookRegistrationSchema>;

export const EventSubscriptionSchema = z.object({
  id: z.string(),
  eventType: z.string(),
  eventSource: EventSourceSchema,
  workflowId: z.string(),
  filter: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.date(),
  active: z.boolean(),
});

export type EventSubscription = z.infer<typeof EventSubscriptionSchema>;

export const COMMON_EVENT_TYPES = {
  connector: [
    "document.created",
    "document.updated",
    "document.deleted",
    "sync.completed",
    "sync.failed",
    "error.occurred",
  ],
  system: [
    "workflow.started",
    "workflow.completed",
    "workflow.failed",
    "approval.requested",
    "approval.granted",
    "approval.denied",
  ],
} as const;

export const CRON_PRESETS = {
  everyMinute: "* * * * *",
  every5Minutes: "*/5 * * * *",
  every15Minutes: "*/15 * * * *",
  everyHour: "0 * * * *",
  everyDay: "0 0 * * *",
  everyWeekday: "0 0 * * 1-5",
  everyMonday: "0 0 * * 1",
  firstOfMonth: "0 0 1 * *",
} as const;
