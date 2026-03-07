import { z } from "zod";

export const APPROVAL_TYPES = ["HIRE_AGENT", "APPROVE_CEO_STRATEGY"] as const;

export const ApprovalTypeSchema = z.enum(APPROVAL_TYPES);
export type ApprovalType = z.infer<typeof ApprovalTypeSchema>;

export const APPROVAL_STATUSES = [
  "PENDING",
  "REVISION_REQUESTED",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
] as const;

export const ApprovalStatusSchema = z.enum(APPROVAL_STATUSES);
export type ApprovalStatus = z.infer<typeof ApprovalStatusSchema>;

export const ControlApprovalSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  type: ApprovalTypeSchema,
  requestedByAgentId: z.string().nullable(),
  requestedByUserId: z.string().nullable(),
  status: ApprovalStatusSchema,
  payload: z.record(z.string(), z.unknown()),
  decisionNote: z.string().nullable(),
  decidedByUserId: z.string().nullable(),
  decidedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ControlApproval = z.infer<typeof ControlApprovalSchema>;

export const ControlApprovalCommentSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  approvalId: z.string(),
  authorAgentId: z.string().nullable(),
  authorUserId: z.string().nullable(),
  body: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ControlApprovalComment = z.infer<
  typeof ControlApprovalCommentSchema
>;

export const ControlIssueApprovalSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  issueId: z.string(),
  approvalId: z.string(),
  createdAt: z.date(),
});

export type ControlIssueApproval = z.infer<typeof ControlIssueApprovalSchema>;
