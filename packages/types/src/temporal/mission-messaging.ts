import { z } from "zod";

export const AgentMessagePrioritySchema = z.enum([
  "critical",
  "high",
  "normal",
  "low",
]);

export type AgentMessagePriority = z.infer<typeof AgentMessagePrioritySchema>;

export const AgentMessageKindSchema = z.enum([
  "direct",
  "broadcast",
  "request",
  "reply",
]);

export type AgentMessageKind = z.infer<typeof AgentMessageKindSchema>;

export const BROADCAST_RECIPIENT = "*";

export const AgentMessageSchema = z.object({
  id: z.string().min(1),
  missionId: z.string().min(1),
  senderId: z.string().min(1),
  senderName: z.string().min(1).optional(),
  recipientId: z.string().min(1),
  kind: AgentMessageKindSchema,
  priority: AgentMessagePrioritySchema.default("normal"),
  subject: z.string().min(1),
  body: z.unknown(),
  correlationId: z.string().min(1).optional(),
  replyToMessageId: z.string().min(1).optional(),
  threadRootId: z.string().min(1).optional(),
  expiresAt: z.number().int().nonnegative().optional(),
  createdAt: z.number().int().nonnegative(),
});

export type AgentMessage = z.infer<typeof AgentMessageSchema>;

export const AgentMessageEnvelopeSchema = z.object({
  message: AgentMessageSchema,
  routedAt: z.number().int().nonnegative().optional(),
  deliveredAt: z.number().int().nonnegative().optional(),
  ttlMs: z.number().int().positive().optional(),
  requestId: z.string().min(1).optional(),
});

export const DLQEntrySchema = z.object({
  originalStreamKey: z.string(),
  originalMessageId: z.string(),
  envelope: AgentMessageEnvelopeSchema,
  deliveryAttempts: z.number().int(),
  deadLetteredAt: z.number().int(),
  reason: z.string(),
});

export type DLQEntry = z.infer<typeof DLQEntrySchema>;

export type AgentMessageEnvelope = z.infer<typeof AgentMessageEnvelopeSchema>;

export const SendMessageInputSchema = z.object({
  recipientId: z.string().min(1),
  subject: z.string().min(1),
  body: z.unknown(),
  kind: AgentMessageKindSchema.default("direct"),
  priority: AgentMessagePrioritySchema.default("normal"),
  correlationId: z.string().min(1).optional(),
  replyToMessageId: z.string().min(1).optional(),
  ttlMs: z.number().int().positive().optional(),
});

export type SendMessageInput = z.infer<typeof SendMessageInputSchema>;

export const WaitForReplyInputSchema = z.object({
  correlationId: z.string().min(1),
  timeoutMs: z.number().int().positive().default(30_000),
});

export type WaitForReplyInput = z.infer<typeof WaitForReplyInputSchema>;

export const AgentInboxDeliverySignalSchema = z.object({
  envelope: AgentMessageEnvelopeSchema,
});

export type AgentInboxDeliverySignal = z.infer<
  typeof AgentInboxDeliverySignalSchema
>;

export const OrchestratorRouteSignalSchema = z.object({
  envelope: AgentMessageEnvelopeSchema,
});

export type OrchestratorRouteSignal = z.infer<
  typeof OrchestratorRouteSignalSchema
>;
