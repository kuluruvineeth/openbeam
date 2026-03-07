import { z } from "zod";

export const CONTROL_ISSUE_STATUSES = [
  "BACKLOG",
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "DONE",
  "BLOCKED",
  "CANCELLED",
] as const;

export const ControlIssueStatusSchema = z.enum(CONTROL_ISSUE_STATUSES);
export type ControlIssueStatus = z.infer<typeof ControlIssueStatusSchema>;

export const CONTROL_ISSUE_PRIORITIES = [
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
] as const;

export const ControlIssuePrioritySchema = z.enum(CONTROL_ISSUE_PRIORITIES);
export type ControlIssuePriority = z.infer<typeof ControlIssuePrioritySchema>;

export const ControlIssueSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  projectId: z.string().nullable(),
  goalId: z.string().nullable(),
  parentId: z.string().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  status: ControlIssueStatusSchema,
  priority: ControlIssuePrioritySchema,
  assigneeAgentId: z.string().nullable(),
  assigneeUserId: z.string().nullable(),
  checkoutRunId: z.string().nullable(),
  executionRunId: z.string().nullable(),
  executionAgentNameKey: z.string().nullable(),
  executionLockedAt: z.date().nullable(),
  createdByAgentId: z.string().nullable(),
  createdByUserId: z.string().nullable(),
  issueNumber: z.number().int().nullable(),
  identifier: z.string().nullable(),
  requestDepth: z.number().int(),
  billingCode: z.string().nullable(),
  assigneeAdapterOverrides: z.record(z.string(), z.unknown()).nullable(),
  startedAt: z.date().nullable(),
  completedAt: z.date().nullable(),
  cancelledAt: z.date().nullable(),
  hiddenAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ControlIssue = z.infer<typeof ControlIssueSchema>;

export const ControlIssueCommentSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  issueId: z.string(),
  authorAgentId: z.string().nullable(),
  authorUserId: z.string().nullable(),
  body: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ControlIssueComment = z.infer<typeof ControlIssueCommentSchema>;

export const ControlIssueAttachmentSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  issueId: z.string(),
  issueCommentId: z.string().nullable(),
  assetId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ControlIssueAttachment = z.infer<
  typeof ControlIssueAttachmentSchema
>;

export const ControlIssueLabelSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  name: z.string(),
  color: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ControlIssueLabel = z.infer<typeof ControlIssueLabelSchema>;

export const ControlIssueLabelAssignmentSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  issueId: z.string(),
  labelId: z.string(),
  createdAt: z.date(),
});

export type ControlIssueLabelAssignment = z.infer<
  typeof ControlIssueLabelAssignmentSchema
>;

export const ControlIssueWithAncestorsSchema = ControlIssueSchema.extend({
  ancestors: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      identifier: z.string().nullable(),
    })
  ),
});

export type ControlIssueWithAncestors = z.infer<
  typeof ControlIssueWithAncestorsSchema
>;
