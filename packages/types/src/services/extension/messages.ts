import { z } from "zod";
import {
  ExtensionActionExecutionSchema,
  ExtensionActionProposalSchema,
} from "./actions";
import { ExtensionHostPolicyDecisionSchema } from "./policy";

export const ExtensionRuntimeSourceSchema = z.enum([
  "background",
  "sidepanel",
  "content",
  "options",
]);
export type ExtensionRuntimeSource = z.infer<
  typeof ExtensionRuntimeSourceSchema
>;

export const ExtensionPageContextSchema = z.object({
  url: z.url(),
  title: z.string().optional(),
  selectionText: z.string().optional(),
});
export type ExtensionPageContext = z.infer<typeof ExtensionPageContextSchema>;

const BaseMessageSchema = z.object({
  requestId: z.string().min(1),
  sentAtMs: z.number().int().nonnegative(),
  source: ExtensionRuntimeSourceSchema,
});

const PingMessageSchema = BaseMessageSchema.extend({
  type: z.literal("extension/ping"),
  payload: z.object({}),
});

const ChatSubmitMessageSchema = BaseMessageSchema.extend({
  type: z.literal("extension/chat.submit"),
  source: z.literal("sidepanel"),
  payload: z.object({
    sessionId: z.string().min(1),
    prompt: z.string().trim().min(1).max(20_000),
    pageContext: ExtensionPageContextSchema.optional(),
    hostDecision: ExtensionHostPolicyDecisionSchema.optional(),
  }),
});

const ActionApproveMessageSchema = BaseMessageSchema.extend({
  type: z.literal("extension/action.approve"),
  source: z.literal("sidepanel"),
  payload: z.object({
    actionId: z.string().min(1),
    sessionId: z.string().min(1),
  }),
});

const ActionRejectMessageSchema = BaseMessageSchema.extend({
  type: z.literal("extension/action.reject"),
  source: z.literal("sidepanel"),
  payload: z.object({
    actionId: z.string().min(1),
    sessionId: z.string().min(1),
    reason: z.string().min(1).optional(),
  }),
});

const ContentContextMessageSchema = BaseMessageSchema.extend({
  type: z.literal("extension/content.context"),
  source: z.literal("content"),
  payload: z.object({
    sessionId: z.string().min(1).optional(),
    pageContext: ExtensionPageContextSchema,
  }),
});

const ContentExecutionResultMessageSchema = BaseMessageSchema.extend({
  type: z.literal("extension/content.execution_result"),
  source: z.literal("content"),
  payload: z.object({
    execution: ExtensionActionExecutionSchema,
  }),
});

export const ExtensionInboundMessageSchema = z.discriminatedUnion("type", [
  PingMessageSchema,
  ChatSubmitMessageSchema,
  ActionApproveMessageSchema,
  ActionRejectMessageSchema,
  ContentContextMessageSchema,
  ContentExecutionResultMessageSchema,
]);
export type ExtensionInboundMessage = z.infer<
  typeof ExtensionInboundMessageSchema
>;

const PongMessageSchema = BaseMessageSchema.extend({
  type: z.literal("extension/pong"),
  source: z.literal("background"),
  payload: z.object({
    version: z.string().min(1),
  }),
});

const AckMessageSchema = BaseMessageSchema.extend({
  type: z.literal("extension/ack"),
  source: z.literal("background"),
  payload: z.object({
    acknowledgedType: z.string().min(1),
  }),
});

const ActionProposedMessageSchema = BaseMessageSchema.extend({
  type: z.literal("extension/action.proposed"),
  source: z.literal("background"),
  payload: z.object({
    proposal: ExtensionActionProposalSchema,
  }),
});

const ActionStatusMessageSchema = BaseMessageSchema.extend({
  type: z.literal("extension/action.status"),
  source: z.literal("background"),
  payload: z.object({
    execution: ExtensionActionExecutionSchema,
  }),
});

const ContentRequestContextMessageSchema = BaseMessageSchema.extend({
  type: z.literal("extension/content.request_context"),
  source: z.literal("background"),
  payload: z.object({
    sessionId: z.string().min(1).optional(),
  }),
});

const ContentExecuteActionMessageSchema = BaseMessageSchema.extend({
  type: z.literal("extension/content.execute_action"),
  source: z.literal("background"),
  payload: z.object({
    proposal: ExtensionActionProposalSchema,
  }),
});

const ErrorCodeSchema = z.enum([
  "invalid_request",
  "unsupported_operation",
  "internal_error",
]);

const ErrorMessageSchema = BaseMessageSchema.extend({
  type: z.literal("extension/error"),
  source: z.literal("background"),
  payload: z.object({
    code: ErrorCodeSchema,
    message: z.string().min(1),
  }),
});

export const ExtensionOutboundMessageSchema = z.discriminatedUnion("type", [
  PongMessageSchema,
  AckMessageSchema,
  ActionProposedMessageSchema,
  ActionStatusMessageSchema,
  ContentRequestContextMessageSchema,
  ContentExecuteActionMessageSchema,
  ErrorMessageSchema,
]);
export type ExtensionOutboundMessage = z.infer<
  typeof ExtensionOutboundMessageSchema
>;

export const ExtensionRuntimeMessageSchema = z.union([
  ExtensionInboundMessageSchema,
  ExtensionOutboundMessageSchema,
]);
export type ExtensionRuntimeMessage = z.infer<
  typeof ExtensionRuntimeMessageSchema
>;
