import { z } from "zod";

export const ApprovalNodeConfigSchema = z.object({
  message: z.string(),
  approvers: z.array(z.string()).optional(),
  timeoutMs: z.number().optional(),
  autoApprove: z.boolean().default(false),
});

export type ApprovalNodeConfig = z.infer<typeof ApprovalNodeConfigSchema>;

export const InputNodeConfigSchema = z.object({
  prompt: z.string(),
  inputType: z.enum(["text", "number", "boolean", "select", "multiselect"]),
  options: z.array(z.string()).optional(),
  required: z.boolean().default(true),
  defaultValue: z.unknown().optional(),
  validation: z.string().optional(),
});

export type InputNodeConfig = z.infer<typeof InputNodeConfigSchema>;

export const NotifyNodeConfigSchema = z.object({
  channel: z.enum(["email", "slack", "webhook"]),
  template: z.string(),
  recipients: z.array(z.string()).optional(),
  webhookUrl: z.string().optional(),
});

export type NotifyNodeConfig = z.infer<typeof NotifyNodeConfigSchema>;

export const AnnotationColorSchema = z.enum([
  "yellow",
  "blue",
  "green",
  "pink",
  "purple",
  "orange",
]);

export type AnnotationColor = z.infer<typeof AnnotationColorSchema>;

export const AnnotationNodeConfigSchema = z.object({
  color: AnnotationColorSchema.default("yellow"),
});

export type AnnotationNodeConfig = z.infer<typeof AnnotationNodeConfigSchema>;
