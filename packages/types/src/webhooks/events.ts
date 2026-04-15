import { z } from "zod";

export const WebhookEventSchema = z.object({
  id: z.string(),
  connectorType: z.string(),
  connectorId: z.string(),
  teamId: z.string(),
  eventType: z.string(),
  payload: z.record(z.string(), z.unknown()),
  receivedAt: z.number(),
  signature: z.string().optional(),
});

export type WebhookEvent = z.infer<typeof WebhookEventSchema>;

export const NormalizedChangeSchema = z.object({
  changeType: z.enum(["created", "updated", "deleted"]),
  documentId: z.string().optional(),
  externalId: z.string(),
  connectorType: z.string(),
  connectorId: z.string(),
  teamId: z.string(),
  timestamp: z.number(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type NormalizedChange = z.infer<typeof NormalizedChangeSchema>;

export const WebhookGatewayResultSchema = z.object({
  accepted: z.boolean(),
  eventId: z.string().optional(),
  deduplicated: z.boolean().default(false),
  rateLimited: z.boolean().default(false),
});

export type WebhookGatewayResult = z.infer<typeof WebhookGatewayResultSchema>;
