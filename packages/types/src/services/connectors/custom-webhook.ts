import { z } from "zod";

export const SignatureAlgorithmSchema = z.enum([
  "hmac-sha256",
  "hmac-sha1",
  "none",
]);

export type SignatureAlgorithm = z.infer<typeof SignatureAlgorithmSchema>;

export const SignatureConfigSchema = z.object({
  header: z.string().min(1).max(256),
  algorithm: SignatureAlgorithmSchema,
  prefix: z.string().max(64).optional(),
});

export type SignatureConfig = z.infer<typeof SignatureConfigSchema>;

export const DedupConfigSchema = z.object({
  idHeader: z.string().max(256).optional(),
  idPath: z.string().max(512).optional(),
  ttlSeconds: z.number().int().min(60).max(604_800).default(86_400),
});

export type DedupConfig = z.infer<typeof DedupConfigSchema>;

export const EventMappingSchema = z.object({
  action: z.enum(["upsert", "delete"]),
  idPath: z.string().min(1).max(512),
  fieldMapping: z.record(z.string(), z.string()),
  documentType: z.string().min(1).max(100).default("custom_document"),
  documentSubtype: z.string().max(100).optional(),
  staticFields: z.record(z.string(), z.string()).optional(),
});

export type EventMapping = z.infer<typeof EventMappingSchema>;

export const WebhookConfigSchema = z.object({
  signature: SignatureConfigSchema.optional(),
  eventTypeField: z.string().max(512).optional(),
  eventTypeHeader: z.string().max(256).optional(),
  eventFilter: z.array(z.string().max(200)).max(100).optional(),
  eventMappings: z.record(z.string(), EventMappingSchema).optional(),
  defaultMapping: EventMappingSchema.optional(),
  dedup: DedupConfigSchema.optional(),
  maxPayloadBytes: z.number().int().min(1024).max(5_242_880).default(1_048_576),
  contentTemplate: z.string().max(10_000).optional(),
  urlTemplate: z.string().max(2000).optional(),
});

export type WebhookConfig = z.infer<typeof WebhookConfigSchema>;

export const WebhookEventActionSchema = z.enum([
  "upsert",
  "delete",
  "ignore",
  "error",
]);

export type WebhookEventAction = z.infer<typeof WebhookEventActionSchema>;

export const WebhookEventStatusSchema = z.enum([
  "received",
  "processing",
  "completed",
  "failed",
  "duplicate",
]);

export type WebhookEventStatus = z.infer<typeof WebhookEventStatusSchema>;

export interface TransformContext {
  connectorId: string;
  teamId: string;
  workspaceId: string;
  slug: string;
}

export interface TransformResult {
  success: boolean;
  action: "upsert" | "delete" | "ignore" | "error";
  documentId?: string;
  document?: Record<string, unknown>;
  error?: string;
}

export interface SignatureVerificationResult {
  valid: boolean;
  error?: string;
}

export interface EventRouteResult {
  shouldProcess: boolean;
  eventType?: string;
  reason?: string;
}
