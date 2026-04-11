import { z } from "zod";
import { BotPlatformSchema } from "./platforms";

export const FormFieldTypeSchema = z.enum([
  "text",
  "number",
  "boolean",
  "select",
  "multiselect",
]);
export type FormFieldType = z.infer<typeof FormFieldTypeSchema>;

export const FormFieldOptionSchema = z.object({
  label: z.string(),
  value: z.string(),
});

export const FormFieldValidationSchema = z.object({
  pattern: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  errorHint: z.string(),
});

export const FormFieldSchema = z.object({
  id: z.string(),
  label: z.string(),
  prompt: z.string(),
  type: FormFieldTypeSchema,
  required: z.boolean().default(true),
  options: z.array(FormFieldOptionSchema).optional(),
  validate: FormFieldValidationSchema.optional(),
  default: z.unknown().optional(),
});
export type FormField = z.infer<typeof FormFieldSchema>;

export const FormStateSchema = z.object({
  formId: z.string(),
  connectorId: z.string(),
  actionId: z.string(),
  platform: BotPlatformSchema,
  conversationKey: z.string(),
  status: z.enum(["collecting", "confirming", "executing"]),
  currentFieldIndex: z.number().int().min(0),
  collected: z.record(z.string(), z.unknown()),
  startedAt: z.number(),
  updatedAt: z.number(),
});
export type FormState = z.infer<typeof FormStateSchema>;

export const FormDefinitionSchema = z.object({
  id: z.string(),
  actionId: z.string(),
  title: z.string(),
  fields: z.array(FormFieldSchema),
});
export type FormDefinition = z.infer<typeof FormDefinitionSchema>;
