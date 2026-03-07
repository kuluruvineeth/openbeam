import { z } from "zod";
import { APPROVAL_TYPES } from "../approvals";

export const CreateControlApprovalInputSchema = z.object({
  type: z.enum(APPROVAL_TYPES),
  requestedByAgentId: z.string().min(1).nullable().optional(),
  payload: z.record(z.string(), z.unknown()),
  issueIds: z.array(z.string().min(1)).optional(),
});

export type CreateControlApprovalInput = z.infer<
  typeof CreateControlApprovalInputSchema
>;

export const ResolveControlApprovalInputSchema = z.object({
  decisionNote: z.string().max(10_000).nullable().optional(),
  decidedByUserId: z.string().min(1).optional().default("board"),
});

export type ResolveControlApprovalInput = z.infer<
  typeof ResolveControlApprovalInputSchema
>;

export const RequestControlApprovalRevisionInputSchema = z.object({
  decisionNote: z.string().max(10_000).nullable().optional(),
  decidedByUserId: z.string().min(1).optional().default("board"),
});

export type RequestControlApprovalRevisionInput = z.infer<
  typeof RequestControlApprovalRevisionInputSchema
>;

export const ResubmitControlApprovalInputSchema = z.object({
  payload: z.record(z.string(), z.unknown()).optional(),
});

export type ResubmitControlApprovalInput = z.infer<
  typeof ResubmitControlApprovalInputSchema
>;

export const AddControlApprovalCommentInputSchema = z.object({
  body: z.string().min(1).max(50_000),
});

export type AddControlApprovalCommentInput = z.infer<
  typeof AddControlApprovalCommentInputSchema
>;
