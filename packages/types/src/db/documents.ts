import { z } from "zod";

export const DocumentOrderBySchema = z.enum([
  "indexedAt",
  "lastSyncedAt",
  "externalId",
]);

export type DocumentOrderBy = z.infer<typeof DocumentOrderBySchema>;

export const SortOrderSchema = z.enum(["asc", "desc"]);

export type SortOrder = z.infer<typeof SortOrderSchema>;

export const DocumentQueryParamsSchema = z.object({
  teamId: z.string(),
  connectorId: z.string().optional(),
  documentType: z.string().optional(),
  limit: z.number().int().positive().optional(),
  cursor: z.string().optional(),
  orderBy: DocumentOrderBySchema.optional(),
  order: SortOrderSchema.optional(),
});

export type DocumentQueryParams = z.infer<typeof DocumentQueryParamsSchema>;

export const DocumentListItemSchema = z.object({
  id: z.string(),
  vespaId: z.string(),
  externalId: z.string(),
  documentType: z.string(),
  documentSubtype: z.string().nullable(),
  connectorId: z.string(),
  indexedAt: z.date(),
  lastSyncedAt: z.date(),
});

export type DocumentListItem = z.infer<typeof DocumentListItemSchema>;

export const DocumentListResultSchema = z.object({
  documents: z.array(DocumentListItemSchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
  total: z.number().int(),
});

export type DocumentListResult = z.infer<typeof DocumentListResultSchema>;

export const DocumentsByTypeCountSchema = z.object({
  documentType: z.string(),
  count: z.number().int(),
});

export type DocumentsByTypeCount = z.infer<typeof DocumentsByTypeCountSchema>;

export const UpsertIndexedDocumentInputSchema = z.object({
  connectorId: z.string(),
  externalId: z.string(),
  vespaId: z.string(),
  documentType: z.string(),
  sourceId: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  checksum: z.string(),
  lastChecksum: z.string().nullable().optional(),
  metadata: z.unknown().optional(),
});

export type UpsertIndexedDocumentInput = z.infer<
  typeof UpsertIndexedDocumentInputSchema
>;
