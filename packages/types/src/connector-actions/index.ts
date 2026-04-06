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
  idempotent: z.boolean().default(false),
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
