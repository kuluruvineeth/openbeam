import { z } from "zod";

export const PushDocumentSchema = z.object({
  id: z.string().min(1).max(512),
  title: z.string().min(1).max(1000),
  content: z.string().min(1).max(1_000_000),
  url: z.string().url().optional(),
  document_type: z.string().min(1).max(100).optional(),
  is_public: z.boolean().optional(),
  created_at: z.iso.datetime().or(z.number()).optional(),
  updated_at: z.iso.datetime().or(z.number()).optional(),
  author_name: z.string().max(256).optional(),
  author_email: z.string().email().max(256).optional(),
  labels: z.array(z.string().max(100)).max(50).optional(),
  status: z.string().max(100).optional(),
  priority: z.string().max(100).optional(),
  parent_id: z.string().max(512).optional(),
  source_name: z.string().max(256).optional(),
  source_path: z.string().max(1024).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  access_control: z.array(z.string().max(256)).max(100).optional(),
});

export type PushDocument = z.infer<typeof PushDocumentSchema>;

export const BatchPushRequestSchema = z.object({
  documents: z.array(PushDocumentSchema).min(1).max(100),
});

export type BatchPushRequest = z.infer<typeof BatchPushRequestSchema>;

export const PushResultSchema = z.object({
  id: z.string(),
  success: z.boolean(),
  error: z.string().optional(),
});

export type PushResult = z.infer<typeof PushResultSchema>;

export const BatchPushResponseSchema = z.object({
  total: z.number(),
  succeeded: z.number(),
  failed: z.number(),
  results: z.array(PushResultSchema),
});

export type BatchPushResponse = z.infer<typeof BatchPushResponseSchema>;

export const DeleteBatchRequestSchema = z.object({
  ids: z.array(z.string().min(1).max(512)).min(1).max(100),
});

export type DeleteBatchRequest = z.infer<typeof DeleteBatchRequestSchema>;

export const ConnectorStatusResponseSchema = z.object({
  slug: z.string(),
  name: z.string(),
  status: z.string(),
  totalDocuments: z.number(),
  totalPushes: z.number(),
  lastPushAt: z.string().nullable(),
  createdAt: z.string(),
});

export type ConnectorStatusResponse = z.infer<
  typeof ConnectorStatusResponseSchema
>;

export const CreateCustomConnectorSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(
      /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/,
      "Slug must be lowercase alphanumeric with hyphens, not starting or ending with a hyphen"
    ),
  description: z.string().max(1000).optional(),
  iconUrl: z.string().url().optional(),
  fieldMappings: z.record(z.string(), z.string()).optional(),
  defaultDocumentType: z.string().min(1).max(100).optional(),
  defaultIsPublic: z.boolean().optional(),
});

export type CreateCustomConnector = z.infer<typeof CreateCustomConnectorSchema>;

export const UpdateCustomConnectorSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  iconUrl: z.string().url().optional(),
  fieldMappings: z.record(z.string(), z.string()).optional(),
  defaultDocumentType: z.string().min(1).max(100).optional(),
  defaultIsPublic: z.boolean().optional(),
});

export type UpdateCustomConnector = z.infer<typeof UpdateCustomConnectorSchema>;

export const CreateCustomConnectorApiKeySchema = z.object({
  name: z.string().min(1).max(200),
  scopes: z
    .array(z.enum(["push", "delete", "status"]))
    .min(1)
    .optional(),
  expiresAt: z.iso.datetime().optional(),
});

export type CreateCustomConnectorApiKey = z.infer<
  typeof CreateCustomConnectorApiKeySchema
>;
