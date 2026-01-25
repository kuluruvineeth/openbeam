import { z } from "zod";

export const SubWorkflowNodeConfigSchema = z.object({
  workflowId: z.string(),
  version: z.string().optional(),
  inputMappings: z.record(z.string(), z.unknown()).optional(),
  outputMappings: z.record(z.string(), z.string()).optional(),
  waitForCompletion: z.boolean().default(true),
  timeoutMs: z.number().positive().optional(),
  inheritContext: z.boolean().default(true),
});

export type SubWorkflowNodeConfig = z.infer<typeof SubWorkflowNodeConfigSchema>;

export const AgentCallNodeConfigSchema = z.object({
  agentId: z.string(),
  prompt: z.string(),
  tools: z.array(z.string()).optional(),
  model: z.string().optional(),
  maxSteps: z.number().positive().default(10),
  temperature: z.number().min(0).max(2).default(0.7),
  systemPromptOverride: z.string().optional(),
});

export type AgentCallNodeConfig = z.infer<typeof AgentCallNodeConfigSchema>;

export const ParallelMapNodeConfigSchema = z.object({
  collection: z.string(),
  maxConcurrency: z.number().positive().default(10),
  continueOnError: z.boolean().default(false),
  timeout: z.number().positive().optional(),
  batchSize: z.number().positive().optional(),
});

export type ParallelMapNodeConfig = z.infer<typeof ParallelMapNodeConfigSchema>;
