import { z } from "zod";

export const ConditionNodeConfigSchema = z.object({
  mode: z.enum(["visual", "expression"]).default("visual"),
  expression: z.string().optional(),
  branches: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      color: z.string().optional(),
      groups: z
        .array(
          z.object({
            id: z.string(),
            logic: z.enum(["and", "or"]).default("and"),
            conditions: z
              .array(
                z.object({
                  id: z.string(),
                  field: z.string(),
                  dataType: z
                    .enum([
                      "string",
                      "number",
                      "boolean",
                      "date",
                      "array",
                      "object",
                      "any",
                    ])
                    .default("string"),
                  operator: z.enum([
                    "equals",
                    "not_equals",
                    "contains",
                    "not_contains",
                    "starts_with",
                    "ends_with",
                    "is_empty",
                    "is_not_empty",
                    "matches_regex",
                    "greater_than",
                    "less_than",
                    "greater_or_equal",
                    "less_or_equal",
                    "is_between",
                    "is_true",
                    "is_false",
                    "is_before",
                    "is_after",
                    "is_today",
                    "is_in_past",
                    "is_in_future",
                    "date_between",
                    "has_key",
                    "key_equals",
                    "array_contains",
                    "array_not_contains",
                    "array_length_equals",
                    "array_length_greater",
                    "array_length_less",
                    "array_is_empty",
                    "exists",
                    "not_exists",
                  ]),
                  value: z
                    .union([z.string(), z.number(), z.boolean(), z.null()])
                    .optional(),
                  secondValue: z
                    .union([z.string(), z.number(), z.null()])
                    .optional()
                    .nullable(),
                })
              )
              .default([]),
          })
        )
        .default([]),
    })
  ),
  defaultBranchLabel: z.string().default("Default"),
  evaluationOrder: z.enum(["sequential", "parallel"]).default("sequential"),
});

export type ConditionNodeConfig = z.infer<typeof ConditionNodeConfigSchema>;

export const LoopExecutionModeSchema = z.enum([
  "sequential",
  "parallel",
  "batch",
]);

export type LoopExecutionMode = z.infer<typeof LoopExecutionModeSchema>;

export const LoopErrorHandlingSchema = z.enum(["stop", "continue", "collect"]);

export type LoopErrorHandling = z.infer<typeof LoopErrorHandlingSchema>;

export const LoopOutputModeSchema = z.enum(["lastOnly", "all", "aggregate"]);

export type LoopOutputMode = z.infer<typeof LoopOutputModeSchema>;

export const LoopNodeConfigSchema = z.object({
  type: z.enum(["forEach", "while", "times"]),

  collection: z.string().optional(),
  condition: z.string().optional(),
  times: z.number().positive().optional(),

  executionMode: LoopExecutionModeSchema.default("sequential"),

  batchSize: z.number().positive().default(10),
  batchDelayMs: z.number().min(0).default(0),

  errorHandling: LoopErrorHandlingSchema.default("stop"),

  maxIterations: z.number().positive().default(100),
  timeoutMs: z.number().positive().optional(),

  breakCondition: z.string().optional(),

  outputMode: LoopOutputModeSchema.default("all"),
  aggregateExpression: z.string().optional(),
});

export type LoopNodeConfig = z.infer<typeof LoopNodeConfigSchema>;

export const ParallelNodeConfigSchema = z.object({
  branches: z.array(z.string()),
  waitForAll: z.boolean().default(true),
  timeoutMs: z.number().optional(),
});

export type ParallelNodeConfig = z.infer<typeof ParallelNodeConfigSchema>;

export const ParallelSplitBranchSchema = z.object({
  id: z.string(),
  label: z.string(),
});

export type ParallelSplitBranch = z.infer<typeof ParallelSplitBranchSchema>;

export const ParallelSplitExecutionModeSchema = z.enum([
  "parallel",
  "sequential",
]);

export type ParallelSplitExecutionMode = z.infer<
  typeof ParallelSplitExecutionModeSchema
>;

export const ParallelSplitDataDistributionSchema = z.enum([
  "broadcast",
  "roundRobin",
  "partition",
]);

export type ParallelSplitDataDistribution = z.infer<
  typeof ParallelSplitDataDistributionSchema
>;

export const ParallelSplitErrorHandlingSchema = z.enum([
  "failFast",
  "continueOnError",
  "collectErrors",
]);

export type ParallelSplitErrorHandling = z.infer<
  typeof ParallelSplitErrorHandlingSchema
>;

export const ParallelSplitNodeConfigSchema = z.object({
  branches: z.array(ParallelSplitBranchSchema).min(2).max(10),

  dataDistribution: ParallelSplitDataDistributionSchema.default("broadcast"),
  partitionKey: z.string().optional(),

  executionMode: ParallelSplitExecutionModeSchema.default("parallel"),
  maxConcurrency: z.number().min(1).max(100).default(10),

  waitForAll: z.boolean().default(true),
  timeoutMs: z.number().min(0).optional(),

  errorHandling: ParallelSplitErrorHandlingSchema.default("failFast"),
});

export type ParallelSplitNodeConfig = z.infer<
  typeof ParallelSplitNodeConfigSchema
>;

export const ParallelJoinModeSchema = z.enum([
  "waitForAll",
  "pickFirst",
  "nOutOfM",
]);

export type ParallelJoinMode = z.infer<typeof ParallelJoinModeSchema>;

export const ParallelJoinMergeStrategySchema = z.enum([
  "append",
  "combine",
  "keepFirst",
  "keepLast",
  "chooseBranch",
]);

export type ParallelJoinMergeStrategy = z.infer<
  typeof ParallelJoinMergeStrategySchema
>;

export const ParallelJoinCombineTypeSchema = z.enum([
  "inner",
  "left",
  "right",
  "outer",
]);

export type ParallelJoinCombineType = z.infer<
  typeof ParallelJoinCombineTypeSchema
>;

export const ParallelJoinEmptyBranchHandlingSchema = z.enum([
  "includeEmpty",
  "skipEmpty",
  "failOnEmpty",
]);

export type ParallelJoinEmptyBranchHandling = z.infer<
  typeof ParallelJoinEmptyBranchHandlingSchema
>;

export const ParallelJoinErrorHandlingSchema = z.enum([
  "failFast",
  "continueOnError",
  "collectErrors",
]);

export type ParallelJoinErrorHandling = z.infer<
  typeof ParallelJoinErrorHandlingSchema
>;

export const ParallelJoinInputSchema = z.object({
  id: z.string(),
  label: z.string(),
});

export type ParallelJoinInput = z.infer<typeof ParallelJoinInputSchema>;

export const ParallelJoinMatchFieldSchema = z.object({
  id: z.string(),
  left: z.string(),
  right: z.string(),
});

export type ParallelJoinMatchField = z.infer<
  typeof ParallelJoinMatchFieldSchema
>;

export const ParallelJoinNodeConfigSchema = z.object({
  inputs: z.array(ParallelJoinInputSchema).min(2).max(10),

  joinMode: ParallelJoinModeSchema.default("waitForAll"),
  requiredCount: z.number().min(1).optional(),

  mergeStrategy: ParallelJoinMergeStrategySchema.default("append"),
  preferredBranch: z.string().optional(),

  combineType: ParallelJoinCombineTypeSchema.optional(),
  matchFields: z.array(ParallelJoinMatchFieldSchema).optional(),

  emptyBranchHandling:
    ParallelJoinEmptyBranchHandlingSchema.default("includeEmpty"),

  timeoutMs: z.number().min(0).optional(),

  errorHandling: ParallelJoinErrorHandlingSchema.default("failFast"),
});

export type ParallelJoinNodeConfig = z.infer<
  typeof ParallelJoinNodeConfigSchema
>;

export const RetryNodeConfigSchema = z.object({
  maxAttempts: z.number().min(1).max(10).default(3),
  backoffMs: z.number().min(100).default(1000),
  exponential: z.boolean().default(true),
  retryOnErrors: z.array(z.string()).optional(),
  jitterMs: z.number().min(0).optional(),
});

export type RetryNodeConfig = z.infer<typeof RetryNodeConfigSchema>;

export const TryCatchNodeConfigSchema = z.object({
  catchErrors: z.array(z.string()).optional(),
  fallbackValue: z.unknown().optional(),
  rethrowUnhandled: z.boolean().default(true),
  logErrors: z.boolean().default(true),
});

export type TryCatchNodeConfig = z.infer<typeof TryCatchNodeConfigSchema>;

export const StartNodeConfigSchema = z.object({
  triggerType: z
    .enum(["manual", "schedule", "webhook", "event"])
    .default("manual"),
  schedule: z.string().optional(),
  webhookConfig: z.lazy(() => WebhookConfigSchemaRef).optional(),
  eventConfig: z.lazy(() => ConnectorEventTriggerConfigSchemaRef).optional(),
});

export type StartNodeConfig = z.infer<typeof StartNodeConfigSchema>;

export const EndNodeConfigSchema = z.object({
  outputType: z
    .enum(["result", "notification", "webhook", "none"])
    .default("result"),
  webhookUrl: z.string().optional(),
  notificationChannel: z.string().optional(),
});

export type EndNodeConfig = z.infer<typeof EndNodeConfigSchema>;

const WebhookConfigSchemaRef = z.object({
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

const ConnectorEventTriggerConfigSchemaRef = z.object({
  connectorId: z.string().optional(),
  connectorType: z.enum([
    "slack",
    "linear",
    "notion",
    "gmail",
    "google-drive",
    "github",
  ]),
  eventId: z.string(),
  resourceId: z.string().optional(),
  resourceType: z.string().optional(),
  resourceName: z.string().optional(),
  filters: z
    .object({
      keywords: z.array(z.string()).optional(),
      userIds: z.array(z.string()).optional(),
      labels: z.array(z.string()).optional(),
      priorities: z.array(z.string()).optional(),
      statuses: z.array(z.string()).optional(),
      channels: z.array(z.string()).optional(),
      mentions: z.boolean().optional(),
      includeReplies: z.boolean().optional(),
      excludeBots: z.boolean().optional(),
      customConditions: z
        .array(
          z.object({
            field: z.string(),
            operator: z.enum([
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
            ]),
            value: z.union([
              z.string(),
              z.number(),
              z.boolean(),
              z.array(z.union([z.string(), z.number()])),
            ]),
          })
        )
        .optional(),
    })
    .optional(),
  options: z
    .object({
      debounceMs: z.number().positive().optional(),
      batchSize: z.number().positive().max(100).optional(),
      batchWindowMs: z.number().positive().optional(),
      deduplicateKey: z.string().optional(),
      maxRetries: z.number().min(0).max(5).optional(),
      retryDelayMs: z.number().positive().optional(),
    })
    .optional(),
});
