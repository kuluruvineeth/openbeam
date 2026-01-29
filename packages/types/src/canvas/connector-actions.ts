import { z } from "zod";

export const ConnectorActionInputTypeSchema = z.enum([
  "string",
  "number",
  "boolean",
  "array",
  "object",
  "file",
  "date",
  "email",
  "url",
  "json",
  "html",
  "markdown",
]);

export type ConnectorActionInputType = z.infer<
  typeof ConnectorActionInputTypeSchema
>;

export const ConnectorActionInputSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: ConnectorActionInputTypeSchema,
  required: z.boolean(),
  description: z.string().optional(),
  default: z.unknown().optional(),
  options: z
    .array(
      z.object({
        label: z.string(),
        value: z.unknown(),
      })
    )
    .optional(),
  validation: z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
      minLength: z.number().optional(),
      maxLength: z.number().optional(),
      pattern: z.string().optional(),
    })
    .optional(),
  dynamic: z.boolean().optional(),
  resourceType: z.string().optional(),
  dependsOn: z.string().optional(),
});

export type ConnectorActionInput = z.infer<typeof ConnectorActionInputSchema>;

export const ConnectorActionOutputTypeSchema = z.enum([
  "string",
  "number",
  "boolean",
  "array",
  "object",
  "void",
]);

export type ConnectorActionOutputType = z.infer<
  typeof ConnectorActionOutputTypeSchema
>;

export const ConnectorActionOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: ConnectorActionOutputTypeSchema,
  description: z.string().optional(),
  schema: z.unknown().optional(),
});

export type ConnectorActionOutput = z.infer<typeof ConnectorActionOutputSchema>;

export const ConnectorActionCategorySchema = z.enum([
  "create",
  "read",
  "update",
  "delete",
  "search",
  "list",
  "notify",
  "sync",
  "transform",
  "batch",
]);

export type ConnectorActionCategory = z.infer<
  typeof ConnectorActionCategorySchema
>;

export const ConnectorActionStakesSchema = z.enum(["low", "medium", "high"]);
export type ConnectorActionStakes = z.infer<typeof ConnectorActionStakesSchema>;

export const ConnectorActionDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  connectorType: z.string(),
  resource: z.string(),
  category: ConnectorActionCategorySchema,
  inputs: z.array(ConnectorActionInputSchema),
  outputs: z.array(ConnectorActionOutputSchema),
  stakes: ConnectorActionStakesSchema.default("medium"),
  reversible: z.boolean().default(false),
  batchSupport: z.boolean().default(false),
  rateLimit: z
    .object({
      requests: z.number(),
      windowMs: z.number(),
    })
    .optional(),
  requiredScopes: z.array(z.string()).optional(),
  documentation: z.string().optional(),
});

export type ConnectorActionDefinition = z.infer<
  typeof ConnectorActionDefinitionSchema
>;

export const ConnectorActionsRegistrySchema = z.object({
  connectorType: z.string(),
  connectorName: z.string(),
  connectorIcon: z.string(),
  actions: z.array(ConnectorActionDefinitionSchema),
});

export type ConnectorActionsRegistry = z.infer<
  typeof ConnectorActionsRegistrySchema
>;

export const RetryConfigSchema = z.object({
  maxAttempts: z.number().min(1).max(10).default(3),
  backoffMs: z.number().min(100).default(1000),
  exponential: z.boolean().default(true),
  retryOnErrors: z.array(z.string()).optional(),
});

export type RetryConfig = z.infer<typeof RetryConfigSchema>;

export const ConnectorActionNodeConfigSchema = z.object({
  connectorType: z.string(),
  connectorId: z.string().optional(),
  actionId: z.string(),
  inputMappings: z.record(z.string(), z.unknown()),
  outputMappings: z.record(z.string(), z.string()).optional(),
  retryConfig: RetryConfigSchema.optional(),
  timeoutMs: z.number().positive().optional(),
  continueOnError: z.boolean().default(false),
});

export type ConnectorActionNodeConfig = z.infer<
  typeof ConnectorActionNodeConfigSchema
>;

export const ConnectorActionNodeDataSchema = z.object({
  label: z.string(),
  description: z.string().optional(),
  config: ConnectorActionNodeConfigSchema,
  status: z.enum(["idle", "running", "success", "error"]).optional(),
  lastError: z.string().optional(),
  lastResult: z.unknown().optional(),
});

export type ConnectorActionNodeData = z.infer<
  typeof ConnectorActionNodeDataSchema
>;

export const ConnectorActionExecuteContextSchema = z.object({
  teamId: z.string(),
  userId: z.string(),
  runId: z.string(),
  nodeId: z.string(),
});

export type ConnectorActionExecuteContext = z.infer<
  typeof ConnectorActionExecuteContextSchema
>;

export const ConnectorActionExecuteParamsSchema = z.object({
  connectorId: z.string(),
  actionId: z.string(),
  inputs: z.record(z.string(), z.unknown()),
  context: ConnectorActionExecuteContextSchema,
});

export type ConnectorActionExecuteParams = z.infer<
  typeof ConnectorActionExecuteParamsSchema
>;

export const ConnectorActionErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  retryable: z.boolean(),
});

export type ConnectorActionError = z.infer<typeof ConnectorActionErrorSchema>;

export const ConnectorActionMetricsSchema = z.object({
  durationMs: z.number(),
  retryCount: z.number().optional(),
});

export type ConnectorActionMetrics = z.infer<
  typeof ConnectorActionMetricsSchema
>;

export const ConnectorActionExecuteResultSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: ConnectorActionErrorSchema.optional(),
  metrics: ConnectorActionMetricsSchema.optional(),
});

export type ConnectorActionExecuteResult = z.infer<
  typeof ConnectorActionExecuteResultSchema
>;
