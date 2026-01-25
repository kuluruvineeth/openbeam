import { z } from "zod";
import { HttpMethodSchema } from "./integration";

export const WebhookConfigSchema = z.object({
  path: z.string(),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("POST"),
  authentication: z
    .enum(["none", "hmac-sha256", "bearer", "basic", "api-key"])
    .default("hmac-sha256"),
  secret: z.string().optional(),
  signatureHeader: z.string().optional(),
  rateLimit: z
    .object({
      requests: z.number(),
      windowMs: z.number(),
    })
    .optional(),
  allowedIps: z.array(z.string()).optional(),
});

export type WebhookConfig = z.infer<typeof WebhookConfigSchema>;

export const EventConfigSchema = z.object({
  connectorId: z.string().optional(),
  connectorType: z.enum(["slack", "linear", "notion", "gmail", "google-drive"]),
  eventId: z.string(),
  resourceId: z.string().optional(),
  resourceType: z.string().optional(),
  resourceName: z.string().optional(),
});

export type EventConfig = z.infer<typeof EventConfigSchema>;

export const FilterOperatorSchema = z.enum([
  "equals",
  "not_equals",
  "contains",
  "not_contains",
  "starts_with",
  "ends_with",
  "regex",
  "gt",
  "lt",
  "gte",
  "lte",
  "in",
  "not_in",
  "exists",
  "not_exists",
]);

export type FilterOperator = z.infer<typeof FilterOperatorSchema>;

export const CustomFilterConditionSchema = z.object({
  field: z.string(),
  operator: FilterOperatorSchema,
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.union([z.string(), z.number()])),
  ]),
});

export type CustomFilterCondition = z.infer<typeof CustomFilterConditionSchema>;

export const EventTriggerFiltersSchema = z.object({
  keywords: z.array(z.string()).optional(),
  userIds: z.array(z.string()).optional(),
  labels: z.array(z.string()).optional(),
  priorities: z.array(z.string()).optional(),
  statuses: z.array(z.string()).optional(),
  channels: z.array(z.string()).optional(),
  mentions: z.boolean().optional(),
  includeReplies: z.boolean().optional(),
  excludeBots: z.boolean().optional(),
  customConditions: z.array(CustomFilterConditionSchema).optional(),
});

export type EventTriggerFilters = z.infer<typeof EventTriggerFiltersSchema>;

export const EventTriggerOptionsSchema = z.object({
  debounceMs: z.number().positive().optional(),
  batchSize: z.number().positive().max(100).optional(),
  batchWindowMs: z.number().positive().optional(),
  deduplicateKey: z.string().optional(),
  maxRetries: z.number().min(0).max(5).optional(),
  retryDelayMs: z.number().positive().optional(),
});

export type EventTriggerOptions = z.infer<typeof EventTriggerOptionsSchema>;

export const ConnectorEventTriggerConfigSchema = z.object({
  connectorId: z.string().optional(),
  connectorType: z.enum(["slack", "linear", "notion", "gmail", "google-drive"]),
  eventId: z.string(),

  resourceId: z.string().optional(),
  resourceType: z.string().optional(),
  resourceName: z.string().optional(),

  filters: EventTriggerFiltersSchema.optional(),
  options: EventTriggerOptionsSchema.optional(),
});

export type ConnectorEventTriggerConfig = z.infer<
  typeof ConnectorEventTriggerConfigSchema
>;

export const TriggerManualNodeConfigSchema = z.object({
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
        defaultValue: z.unknown().optional(),
      })
    )
    .optional(),
  requiredPermissions: z.array(z.string()).optional(),
});

export type TriggerManualNodeConfig = z.infer<
  typeof TriggerManualNodeConfigSchema
>;

export const TriggerScheduleNodeConfigSchema = z.object({
  cron: z.string(),
  timezone: z.string().default("UTC"),
  enabled: z.boolean().default(true),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  maxRuns: z.number().positive().optional(),
  runOnStart: z.boolean().default(false),
  catchUpMissed: z.boolean().default(false),
});

export type TriggerScheduleNodeConfig = z.infer<
  typeof TriggerScheduleNodeConfigSchema
>;

export const TriggerWebhookNodeConfigSchema = z.object({
  path: z.string(),
  method: HttpMethodSchema.default("POST"),
  authentication: z
    .enum(["none", "bearer", "basic", "hmac", "api_key"])
    .default("none"),
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
});

export type TriggerWebhookNodeConfig = z.infer<
  typeof TriggerWebhookNodeConfigSchema
>;

export const TriggerEventNodeConfigSchema = z.object({
  eventType: z.string(),
  eventSource: z
    .enum(["connector", "system", "custom", "workflow"])
    .default("system"),
  connectorType: z.string().optional(),
  filter: z.record(z.string(), z.unknown()).optional(),
  debounceMs: z.number().positive().optional(),
  batchSize: z.number().positive().optional(),
  batchWindowMs: z.number().positive().optional(),
});

export type TriggerEventNodeConfig = z.infer<
  typeof TriggerEventNodeConfigSchema
>;
