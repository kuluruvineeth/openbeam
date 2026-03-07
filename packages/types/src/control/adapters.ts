import { z } from "zod";

export const AdapterBillingTypeSchema = z.enum([
  "api",
  "subscription",
  "unknown",
]);
export type AdapterBillingType = z.infer<typeof AdapterBillingTypeSchema>;

export const AdapterAgentSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  name: z.string(),
  adapterType: z.string().nullable(),
  adapterConfig: z.unknown(),
});

export type AdapterAgent = z.infer<typeof AdapterAgentSchema>;

export const AdapterRuntimeSchema = z.object({
  sessionId: z.string().nullable(),
  sessionParams: z.record(z.string(), z.unknown()).nullable(),
  sessionDisplayId: z.string().nullable(),
  taskKey: z.string().nullable(),
});

export type AdapterRuntime = z.infer<typeof AdapterRuntimeSchema>;

export const AdapterInvocationMetaSchema = z.object({
  adapterType: z.string(),
  command: z.string(),
  cwd: z.string().optional(),
  commandArgs: z.array(z.string()).optional(),
  commandNotes: z.array(z.string()).optional(),
  env: z.record(z.string(), z.string()).optional(),
  prompt: z.string().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
});

export type AdapterInvocationMeta = z.infer<typeof AdapterInvocationMetaSchema>;

export const AdapterExecutionContextSchema = z.object({
  runId: z.string(),
  agent: AdapterAgentSchema,
  runtime: AdapterRuntimeSchema,
  config: z.record(z.string(), z.unknown()),
  context: z.record(z.string(), z.unknown()),
  authToken: z.string().optional(),
});

export type AdapterExecutionContext = z.infer<
  typeof AdapterExecutionContextSchema
>;

export const AdapterUsageSummarySchema = z.object({
  inputTokens: z.number().int(),
  outputTokens: z.number().int(),
  cachedInputTokens: z.number().int().optional(),
});

export type AdapterUsageSummary = z.infer<typeof AdapterUsageSummarySchema>;

export const AdapterExecutionResultSchema = z.object({
  exitCode: z.number().int().nullable(),
  signal: z.string().nullable(),
  timedOut: z.boolean(),
  errorMessage: z.string().nullable().optional(),
  errorCode: z.string().nullable().optional(),
  errorMeta: z.record(z.string(), z.unknown()).optional(),
  usage: AdapterUsageSummarySchema.optional(),
  sessionId: z.string().nullable().optional(),
  sessionParams: z.record(z.string(), z.unknown()).nullable().optional(),
  sessionDisplayId: z.string().nullable().optional(),
  provider: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  billingType: AdapterBillingTypeSchema.nullable().optional(),
  costUsd: z.number().nullable().optional(),
  resultJson: z.record(z.string(), z.unknown()).nullable().optional(),
  summary: z.string().nullable().optional(),
  clearSession: z.boolean().optional(),
});

export type AdapterExecutionResult = z.infer<
  typeof AdapterExecutionResultSchema
>;

export const ADAPTER_ENV_CHECK_LEVELS = ["info", "warn", "error"] as const;
export const AdapterEnvCheckLevelSchema = z.enum(ADAPTER_ENV_CHECK_LEVELS);
export type AdapterEnvCheckLevel = z.infer<typeof AdapterEnvCheckLevelSchema>;

export const AdapterEnvironmentCheckSchema = z.object({
  code: z.string(),
  level: AdapterEnvCheckLevelSchema,
  message: z.string(),
  detail: z.string().nullable().optional(),
  hint: z.string().nullable().optional(),
});

export type AdapterEnvironmentCheck = z.infer<
  typeof AdapterEnvironmentCheckSchema
>;

export const ADAPTER_ENV_TEST_STATUSES = ["pass", "warn", "fail"] as const;
export const AdapterEnvTestStatusSchema = z.enum(ADAPTER_ENV_TEST_STATUSES);
export type AdapterEnvTestStatus = z.infer<typeof AdapterEnvTestStatusSchema>;

export const AdapterEnvironmentTestResultSchema = z.object({
  adapterType: z.string(),
  status: AdapterEnvTestStatusSchema,
  checks: z.array(AdapterEnvironmentCheckSchema),
  testedAt: z.string(),
});

export type AdapterEnvironmentTestResult = z.infer<
  typeof AdapterEnvironmentTestResultSchema
>;

export const TranscriptEntryAssistantSchema = z.object({
  kind: z.literal("assistant"),
  ts: z.string(),
  text: z.string(),
});

export const TranscriptEntryThinkingSchema = z.object({
  kind: z.literal("thinking"),
  ts: z.string(),
  text: z.string(),
});

export const TranscriptEntryUserSchema = z.object({
  kind: z.literal("user"),
  ts: z.string(),
  text: z.string(),
});

export const TranscriptEntryToolCallSchema = z.object({
  kind: z.literal("tool_call"),
  ts: z.string(),
  name: z.string(),
  input: z.unknown(),
});

export const TranscriptEntryToolResultSchema = z.object({
  kind: z.literal("tool_result"),
  ts: z.string(),
  toolUseId: z.string(),
  content: z.string(),
  isError: z.boolean(),
});

export const TranscriptEntryInitSchema = z.object({
  kind: z.literal("init"),
  ts: z.string(),
  model: z.string(),
  sessionId: z.string(),
});

export const TranscriptEntryResultSchema = z.object({
  kind: z.literal("result"),
  ts: z.string(),
  text: z.string(),
  inputTokens: z.number().int(),
  outputTokens: z.number().int(),
  cachedTokens: z.number().int(),
  costUsd: z.number(),
  subtype: z.string(),
  isError: z.boolean(),
  errors: z.array(z.string()),
});

export const TranscriptEntryStderrSchema = z.object({
  kind: z.literal("stderr"),
  ts: z.string(),
  text: z.string(),
});

export const TranscriptEntrySystemSchema = z.object({
  kind: z.literal("system"),
  ts: z.string(),
  text: z.string(),
});

export const TranscriptEntryStdoutSchema = z.object({
  kind: z.literal("stdout"),
  ts: z.string(),
  text: z.string(),
});

export const TranscriptEntrySchema = z.discriminatedUnion("kind", [
  TranscriptEntryAssistantSchema,
  TranscriptEntryThinkingSchema,
  TranscriptEntryUserSchema,
  TranscriptEntryToolCallSchema,
  TranscriptEntryToolResultSchema,
  TranscriptEntryInitSchema,
  TranscriptEntryResultSchema,
  TranscriptEntryStderrSchema,
  TranscriptEntrySystemSchema,
  TranscriptEntryStdoutSchema,
]);

export type TranscriptEntry = z.infer<typeof TranscriptEntrySchema>;
