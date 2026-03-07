import { z } from "zod";
import {
  AGENT_ICON_NAMES,
  CONTROL_AGENT_ADAPTER_TYPES,
  CONTROL_AGENT_ROLES,
  CONTROL_AGENT_STATUSES,
} from "../agents";

export const EnvBindingPlainSchema = z.object({
  type: z.literal("plain"),
  value: z.string(),
});

export type EnvBindingPlain = z.infer<typeof EnvBindingPlainSchema>;

export const EnvBindingSecretRefSchema = z.object({
  type: z.literal("secret_ref"),
  secretId: z.string().min(1),
  version: z
    .union([z.literal("latest"), z.number().int().positive()])
    .optional(),
});

export type EnvBindingSecretRef = z.infer<typeof EnvBindingSecretRefSchema>;

export const EnvBindingSchema = z.union([
  z.string(),
  EnvBindingPlainSchema,
  EnvBindingSecretRefSchema,
]);

export type EnvBinding = z.infer<typeof EnvBindingSchema>;

export const EnvConfigSchema = z.record(z.string(), EnvBindingSchema);
export type EnvConfig = z.infer<typeof EnvConfigSchema>;

const adapterConfigSchema = z
  .record(z.string(), z.unknown())
  .superRefine((value, ctx) => {
    if (value.env === undefined) {
      return;
    }
    const parsed = EnvConfigSchema.safeParse(value.env);
    if (!parsed.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "adapterConfig.env must be a map of valid env bindings",
        path: ["env"],
      });
    }
  });

export const CreateControlAgentInputSchema = z.object({
  name: z.string().min(1).max(120),
  role: z.enum(CONTROL_AGENT_ROLES).optional().default("general"),
  title: z.string().max(255).nullable().optional(),
  icon: z.enum(AGENT_ICON_NAMES).nullable().optional(),
  reportsTo: z.string().min(1).nullable().optional(),
  capabilities: z.string().max(4000).nullable().optional(),
  adapterType: z
    .enum(CONTROL_AGENT_ADAPTER_TYPES)
    .optional()
    .default("PROCESS"),
  adapterConfig: adapterConfigSchema.optional().default({}),
  runtimeConfig: z.record(z.string(), z.unknown()).optional().default({}),
  budgetMonthlyCents: z.number().int().nonnegative().optional().default(0),
  permissions: z
    .object({ canCreateAgents: z.boolean().optional().default(false) })
    .optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type CreateControlAgentInput = z.infer<
  typeof CreateControlAgentInputSchema
>;

export const CreateControlAgentHireInputSchema =
  CreateControlAgentInputSchema.extend({
    sourceIssueId: z.string().min(1).nullable().optional(),
    sourceIssueIds: z.array(z.string().min(1)).optional(),
  });

export type CreateControlAgentHireInput = z.infer<
  typeof CreateControlAgentHireInputSchema
>;

export const UpdateControlAgentInputSchema = CreateControlAgentInputSchema.omit(
  { permissions: true }
)
  .partial()
  .extend({
    status: z.enum(CONTROL_AGENT_STATUSES).optional(),
    spentMonthlyCents: z.number().int().nonnegative().optional(),
  });

export type UpdateControlAgentInput = z.infer<
  typeof UpdateControlAgentInputSchema
>;

export const UpdateControlAgentPermissionsInputSchema = z.object({
  canCreateAgents: z.boolean(),
});

export type UpdateControlAgentPermissionsInput = z.infer<
  typeof UpdateControlAgentPermissionsInputSchema
>;

export const CreateControlAgentApiKeyInputSchema = z.object({
  name: z.string().min(1).max(120).default("default"),
});

export type CreateControlAgentApiKeyInput = z.infer<
  typeof CreateControlAgentApiKeyInputSchema
>;

export const WakeControlAgentInputSchema = z.object({
  source: z
    .enum(["TIMER", "ASSIGNMENT", "ON_DEMAND", "AUTOMATION"])
    .optional()
    .default("ON_DEMAND"),
  triggerDetail: z.string().max(255).optional(),
  reason: z.string().max(1000).nullable().optional(),
  payload: z.record(z.string(), z.unknown()).nullable().optional(),
  idempotencyKey: z.string().max(255).nullable().optional(),
});

export type WakeControlAgentInput = z.infer<typeof WakeControlAgentInputSchema>;

export const ResetControlAgentSessionInputSchema = z.object({
  taskKey: z.string().min(1).max(255).nullable().optional(),
});

export type ResetControlAgentSessionInput = z.infer<
  typeof ResetControlAgentSessionInputSchema
>;

export const TestAdapterEnvironmentInputSchema = z.object({
  adapterConfig: adapterConfigSchema.optional().default({}),
});

export type TestAdapterEnvironmentInput = z.infer<
  typeof TestAdapterEnvironmentInputSchema
>;

export const UpdateAgentInstructionsPathInputSchema = z.object({
  path: z.string().trim().min(1).nullable(),
  adapterConfigKey: z.string().trim().min(1).optional(),
});

export type UpdateAgentInstructionsPathInput = z.infer<
  typeof UpdateAgentInstructionsPathInputSchema
>;
