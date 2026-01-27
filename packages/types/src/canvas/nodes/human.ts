import { z } from "zod";

export const ApprovalSeveritySchema = z.enum([
  "low",
  "medium",
  "high",
  "critical",
]);

export type ApprovalSeverity = z.infer<typeof ApprovalSeveritySchema>;

export const ApprovalActionSchema = z.enum([
  "approve",
  "reject",
  "delegate",
  "request_info",
]);

export type ApprovalAction = z.infer<typeof ApprovalActionSchema>;

export const ApproverSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().optional(),
  avatar: z.string().optional(),
  role: z.string().optional(),
});

export type Approver = z.infer<typeof ApproverSchema>;

export const ApprovalNodeConfigSchema = z.object({
  message: z.string(),
  approvalType: z.enum(["single", "sequential", "parallel"]).default("single"),
  requiredApprovals: z.number().default(1),
  approvers: z.array(ApproverSchema).optional(),
  severity: ApprovalSeveritySchema.default("medium"),
  allowedActions: z.array(ApprovalActionSchema).default(["approve", "reject"]),
  timeoutMs: z.number().optional(),
  timeoutAction: z.enum(["reject", "escalate", "approve"]).default("reject"),
  escalation: z
    .object({
      enabled: z.boolean().default(false),
      escalateToId: z.string().optional(),
      escalateAfterMs: z.number().optional(),
    })
    .optional(),
  notification: z
    .object({
      channels: z
        .array(z.enum(["email", "slack", "webhook"]))
        .default(["email"]),
      customMessage: z.string().optional(),
      includeContext: z.boolean().default(true),
    })
    .optional(),
  autoApprove: z.boolean().default(false),
  requireComment: z.boolean().default(false),
  customLabels: z
    .object({
      approve: z.string().optional(),
      reject: z.string().optional(),
    })
    .optional(),
});

export type ApprovalNodeConfig = z.infer<typeof ApprovalNodeConfigSchema>;

export const InputFieldTypeSchema = z.enum([
  "text",
  "textarea",
  "number",
  "boolean",
  "date",
  "select",
  "multiselect",
  "email",
  "url",
  "file",
  "password",
  "hidden",
]);

export type InputFieldType = z.infer<typeof InputFieldTypeSchema>;

export const InputFieldValidationSchema = z.object({
  required: z.boolean().default(false),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  pattern: z.string().optional(),
  accept: z.string().optional(),
  customError: z.string().optional(),
});

export type InputFieldValidation = z.infer<typeof InputFieldValidationSchema>;

export const InputFieldOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
});

export type InputFieldOption = z.infer<typeof InputFieldOptionSchema>;

export const InputFieldSchema = z.object({
  id: z.string(),
  type: InputFieldTypeSchema,
  label: z.string(),
  placeholder: z.string().optional(),
  helperText: z.string().optional(),
  defaultValue: z.unknown().optional(),
  options: z.array(InputFieldOptionSchema).optional(),
  validation: InputFieldValidationSchema.optional(),
  width: z.enum(["full", "half"]).default("full"),
});

export type InputField = z.infer<typeof InputFieldSchema>;

export const InputNodeConfigSchema = z.object({
  prompt: z.string(),
  fields: z.array(InputFieldSchema).default([]),
  submitLabel: z.string().default("Submit"),
  allowSkip: z.boolean().default(false),
  skipLabel: z.string().default("Skip"),
  timeoutMs: z.number().optional(),
  timeoutAction: z.enum(["skip", "error", "default"]).default("skip"),
});

export type InputNodeConfig = z.infer<typeof InputNodeConfigSchema>;

export const NotifyChannelSchema = z.enum([
  "email",
  "slack",
  "webhook",
  "sms",
  "in_app",
]);

export type NotifyChannel = z.infer<typeof NotifyChannelSchema>;

export const NotifyPrioritySchema = z.enum(["low", "normal", "high", "urgent"]);

export type NotifyPriority = z.infer<typeof NotifyPrioritySchema>;

export const NotifyFormatSchema = z.enum(["plain", "markdown", "html", "json"]);

export type NotifyFormat = z.infer<typeof NotifyFormatSchema>;

export const NotifyNodeConfigSchema = z.object({
  channels: z.array(NotifyChannelSchema).default(["email"]),
  priority: NotifyPrioritySchema.default("normal"),
  subject: z.string().default(""),
  template: z.string().default(""),
  format: NotifyFormatSchema.default("markdown"),
  recipients: z.array(z.string()).optional(),
  recipientExpression: z.string().optional(),
  webhookUrl: z.string().optional(),
  webhookHeaders: z.record(z.string(), z.string()).optional(),
  retryOnFailure: z.boolean().default(false),
  maxRetries: z.number().min(0).max(5).default(3),
  includeContext: z.boolean().default(true),
  groupKey: z.string().optional(),
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

export const AnnotationFontSizeSchema = z.enum(["sm", "base"]);

export type AnnotationFontSize = z.infer<typeof AnnotationFontSizeSchema>;

export const AnnotationNodeConfigSchema = z.object({
  color: AnnotationColorSchema.default("yellow"),
  content: z.string().default(""),
  width: z.number().min(160).max(600).default(240),
  height: z.number().min(60).max(800).optional(),
  isPinned: z.boolean().default(false),
  isCollapsed: z.boolean().default(false),
  fontSize: AnnotationFontSizeSchema.default("sm"),
});

export type AnnotationNodeConfig = z.infer<typeof AnnotationNodeConfigSchema>;
