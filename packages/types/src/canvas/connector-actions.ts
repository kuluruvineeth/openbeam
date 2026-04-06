import { z } from "zod";

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
