import { z } from "zod";

export const SubWorkflowInputModeSchema = z.enum([
  "fields",
  "json",
  "passthrough",
]);
export type SubWorkflowInputMode = z.infer<typeof SubWorkflowInputModeSchema>;

export const SubWorkflowNodeConfigSchema = z.object({
  workflowId: z.string(),
  workflowName: z.string().optional(),
  version: z.string().optional(),
  inputMappings: z.record(z.string(), z.unknown()).optional(),
  outputMappings: z.record(z.string(), z.string()).optional(),
  waitForCompletion: z.boolean().default(true),
  timeoutMs: z.number().positive().optional(),
  inheritContext: z.boolean().default(true),
  inputMode: SubWorkflowInputModeSchema.default("fields"),
  retryOnFailure: z.boolean().default(false),
  maxRetries: z.number().positive().default(3),
});

export type SubWorkflowNodeConfig = z.infer<typeof SubWorkflowNodeConfigSchema>;

export const AgentExecutionModeSchema = z.enum([
  "react",
  "sequential",
  "parallel",
  "hierarchical",
]);
export type AgentExecutionMode = z.infer<typeof AgentExecutionModeSchema>;

export const AgentOutputFormatSchema = z.enum(["text", "json", "structured"]);
export type AgentOutputFormat = z.infer<typeof AgentOutputFormatSchema>;

export const AgentCallNodeConfigSchema = z.object({
  agentId: z.string(),
  agentName: z.string().optional(),
  prompt: z.string(),
  tools: z.array(z.string()).optional(),
  model: z.string().optional(),
  maxSteps: z.number().positive().default(10),
  temperature: z.number().min(0).max(2).default(0.7),
  systemPromptOverride: z.string().optional(),
  executionMode: AgentExecutionModeSchema.default("react"),
  stopCondition: z.string().optional(),
  outputFormat: AgentOutputFormatSchema.default("text"),
  memoryEnabled: z.boolean().default(true),
});

export type AgentCallNodeConfig = z.infer<typeof AgentCallNodeConfigSchema>;

export const ParallelAggregationModeSchema = z.enum([
  "array",
  "object",
  "merge",
  "custom",
]);
export type ParallelAggregationMode = z.infer<
  typeof ParallelAggregationModeSchema
>;

export const ParallelMapNodeConfigSchema = z.object({
  collection: z.string(),
  itemVariable: z.string().default("item"),
  indexVariable: z.string().default("index"),
  maxConcurrency: z.number().positive().default(10),
  continueOnError: z.boolean().default(false),
  timeout: z.number().positive().optional(),
  batchSize: z.number().positive().optional(),
  batchDelayMs: z.number().default(0),
  aggregationMode: ParallelAggregationModeSchema.default("array"),
  progressTracking: z.boolean().default(true),
});

export type ParallelMapNodeConfig = z.infer<typeof ParallelMapNodeConfigSchema>;
