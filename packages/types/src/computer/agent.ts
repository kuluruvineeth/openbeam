import { z } from "zod";

export const ComputerAgentSourceSchema = z.enum(["CATALOG", "GENERATED"]);
export type ComputerAgentSource = z.infer<typeof ComputerAgentSourceSchema>;

export const ComputerAgentStatusSchema = z.enum([
  "DRAFT",
  "ACTIVE",
  "PAUSED",
  "ARCHIVED",
  "ERROR",
]);
export type ComputerAgentStatus = z.infer<typeof ComputerAgentStatusSchema>;

export const ComputerAgentModeSchema = z.enum([
  "AUTONOMOUS",
  "APPROVAL",
  "REPORT_ONLY",
]);
export type ComputerAgentMode = z.infer<typeof ComputerAgentModeSchema>;

export const AgentConfigSchema = z.object({
  maxSteps: z.number().int().min(1).max(100).default(50),
  maxDurationMs: z.number().int().min(1000).max(600_000).default(300_000),
  model: z.string().default("claude-haiku-4-5"),
  temperature: z.number().min(0).max(1).default(0.1),
  tools: z.array(z.string()).default([]),
  toolBudget: z.number().int().min(1).max(50).default(12),
  memoryEnabled: z.boolean().default(true),
  notifyChannels: z.array(z.string()).default(["in_app"]),
  retryOnFailure: z.boolean().default(true),
  maxRetries: z.number().int().min(0).max(5).default(2),
});
export type AgentConfig = z.infer<typeof AgentConfigSchema>;

export const CreateComputerAgentInputSchema = z.object({
  teamId: z.string(),
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9-]+$/),
  description: z.string().max(1000).optional(),
  source: ComputerAgentSourceSchema,
  code: z.string().min(1).max(100_000),
  templateId: z.string().max(255).optional(),
  scheduleCron: z.string().max(255).optional(),
  status: ComputerAgentStatusSchema.default("DRAFT"),
  mode: ComputerAgentModeSchema.default("APPROVAL"),
  config: AgentConfigSchema.optional(),
  createdBy: z.string().optional(),
});
export type CreateComputerAgentInput = z.infer<
  typeof CreateComputerAgentInputSchema
>;

export const UpdateComputerAgentInputSchema = z.object({
  status: ComputerAgentStatusSchema.optional(),
  mode: ComputerAgentModeSchema.optional(),
  scheduleCron: z.string().max(255).nullable().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  code: z.string().max(100_000).optional(),
});
export type UpdateComputerAgentInput = z.infer<
  typeof UpdateComputerAgentInputSchema
>;
