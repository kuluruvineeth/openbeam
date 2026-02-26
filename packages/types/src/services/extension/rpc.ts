import { z } from "zod";
import { ExtensionActionProposalSchema } from "./actions";
import { ExtensionPageContextSchema } from "./messages";
import { ExtensionHostPolicyDecisionSchema } from "./policy";

export const ExtensionChatSubmitRequestSchema = z.object({
  sessionId: z.string().min(1),
  prompt: z.string().trim().min(1).max(20_000),
  pageContext: ExtensionPageContextSchema.optional(),
  hostDecision: ExtensionHostPolicyDecisionSchema.optional(),
});
export type ExtensionChatSubmitRequest = z.infer<
  typeof ExtensionChatSubmitRequestSchema
>;

export const ExtensionChatSubmitResponseSchema = z.object({
  proposal: ExtensionActionProposalSchema,
});
export type ExtensionChatSubmitResponse = z.infer<
  typeof ExtensionChatSubmitResponseSchema
>;

export const ExtensionRpcErrorResponseSchema = z.object({
  error: z.string().min(1),
  code: z.string().min(1).optional(),
});
export type ExtensionRpcErrorResponse = z.infer<
  typeof ExtensionRpcErrorResponseSchema
>;
