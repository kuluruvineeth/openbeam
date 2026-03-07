import { z } from "zod";
import { CONTROL_ISSUE_PRIORITIES, CONTROL_ISSUE_STATUSES } from "../issues";

export const IssueAssigneeAdapterOverridesSchema = z
  .object({
    adapterConfig: z.record(z.string(), z.unknown()).optional(),
    useProjectWorkspace: z.boolean().optional(),
  })
  .strict();

export type IssueAssigneeAdapterOverrides = z.infer<
  typeof IssueAssigneeAdapterOverridesSchema
>;

export const CreateControlIssueInputSchema = z.object({
  projectId: z.string().min(1).nullable().optional(),
  goalId: z.string().min(1).nullable().optional(),
  parentId: z.string().min(1).nullable().optional(),
  title: z.string().min(1).max(500),
  description: z.string().max(50_000).nullable().optional(),
  status: z.enum(CONTROL_ISSUE_STATUSES).optional().default("BACKLOG"),
  priority: z.enum(CONTROL_ISSUE_PRIORITIES).optional().default("MEDIUM"),
  assigneeAgentId: z.string().min(1).nullable().optional(),
  assigneeUserId: z.string().min(1).nullable().optional(),
  requestDepth: z.number().int().nonnegative().optional().default(0),
  billingCode: z.string().max(120).nullable().optional(),
  assigneeAdapterOverrides:
    IssueAssigneeAdapterOverridesSchema.nullable().optional(),
  labelIds: z.array(z.string().min(1)).optional(),
});

export type CreateControlIssueInput = z.infer<
  typeof CreateControlIssueInputSchema
>;

export const UpdateControlIssueInputSchema =
  CreateControlIssueInputSchema.partial().extend({
    comment: z.string().min(1).max(50_000).optional(),
    hiddenAt: z.coerce.date().nullable().optional(),
  });

export type UpdateControlIssueInput = z.infer<
  typeof UpdateControlIssueInputSchema
>;

export const CheckoutControlIssueInputSchema = z.object({
  agentId: z.string().min(1),
  expectedStatuses: z.array(z.enum(CONTROL_ISSUE_STATUSES)).nonempty(),
});

export type CheckoutControlIssueInput = z.infer<
  typeof CheckoutControlIssueInputSchema
>;

export const AddControlIssueCommentInputSchema = z.object({
  body: z.string().min(1).max(50_000),
  reopen: z.boolean().optional(),
  interrupt: z.boolean().optional(),
});

export type AddControlIssueCommentInput = z.infer<
  typeof AddControlIssueCommentInputSchema
>;

export const CreateControlIssueLabelInputSchema = z.object({
  name: z.string().trim().min(1).max(48),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Color must be a 6-digit hex value"),
});

export type CreateControlIssueLabelInput = z.infer<
  typeof CreateControlIssueLabelInputSchema
>;

export const LinkControlIssueApprovalInputSchema = z.object({
  approvalId: z.string().min(1),
});

export type LinkControlIssueApprovalInput = z.infer<
  typeof LinkControlIssueApprovalInputSchema
>;

export const CreateControlIssueAttachmentMetadataInputSchema = z.object({
  issueCommentId: z.string().min(1).nullable().optional(),
});

export type CreateControlIssueAttachmentMetadataInput = z.infer<
  typeof CreateControlIssueAttachmentMetadataInputSchema
>;
