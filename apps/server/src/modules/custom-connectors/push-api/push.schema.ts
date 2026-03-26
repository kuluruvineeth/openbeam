import { z } from "@hono/zod-openapi";

export const PushDocumentBodySchema = z.object({
  id: z.string().min(1).max(512).openapi({ description: "Unique document ID" }),
  title: z.string().min(1).max(1000).openapi({ description: "Document title" }),
  content: z
    .string()
    .min(1)
    .max(1_000_000)
    .openapi({ description: "Document content" }),
  url: z.string().url().optional().openapi({ description: "Source URL" }),
  document_type: z.string().min(1).max(100).optional(),
  is_public: z.boolean().optional(),
  created_at: z.string().datetime().or(z.number()).optional(),
  updated_at: z.string().datetime().or(z.number()).optional(),
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

export const BatchPushBodySchema = z.object({
  documents: z.array(PushDocumentBodySchema).min(1).max(100),
});

export const DeleteBatchBodySchema = z.object({
  ids: z.array(z.string().min(1).max(512)).min(1).max(100),
});

export const PushSuccessResponseSchema = z.object({
  success: z.boolean(),
  documentId: z.string(),
});

export const BatchPushResponseSchema = z.object({
  total: z.number(),
  succeeded: z.number(),
  failed: z.number(),
  results: z.array(
    z.object({
      id: z.string(),
      success: z.boolean(),
      error: z.string().optional(),
    })
  ),
});

export const DeleteSuccessResponseSchema = z.object({
  success: z.boolean(),
  documentId: z.string(),
});

export const DeleteBatchResponseSchema = z.object({
  total: z.number(),
  succeeded: z.number(),
  failed: z.number(),
  results: z.array(
    z.object({
      id: z.string(),
      success: z.boolean(),
      error: z.string().optional(),
    })
  ),
});

export const StatusResponseSchema = z.object({
  slug: z.string(),
  name: z.string(),
  status: z.string(),
  totalDocuments: z.number(),
  totalPushes: z.number(),
  lastPushAt: z.string().nullable(),
  createdAt: z.string(),
});

export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

export const SlugParamSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(100)
    .openapi({ param: { name: "slug", in: "path" } }),
});

export const DocumentIdParamSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(100)
    .openapi({ param: { name: "slug", in: "path" } }),
  documentId: z
    .string()
    .min(1)
    .max(512)
    .openapi({ param: { name: "documentId", in: "path" } }),
});
