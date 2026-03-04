import { z } from "zod";

export const EdgeSearchResultSchema = z.object({
  documentId: z.string(),
  title: z.string(),
  snippet: z.string(),
  score: z.number(),
  ftsScore: z.number().optional(),
  vectorScore: z.number().optional(),
  connectorId: z.string(),
  documentType: z.string().optional(),
  updatedAt: z.number().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type EdgeSearchResult = z.infer<typeof EdgeSearchResultSchema>;

export const EdgeSearchQuerySchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().positive().default(10),
  offset: z.number().int().nonnegative().default(0),
  connectorIds: z.array(z.string()).optional(),
  documentTypes: z.array(z.string()).optional(),
  dateRange: z
    .object({
      from: z.number().optional(),
      to: z.number().optional(),
    })
    .optional(),
  hybridAlpha: z.number().min(0).max(1).optional(),
});

export type EdgeSearchQuery = z.infer<typeof EdgeSearchQuerySchema>;

export const EdgeSearchResponseSchema = z.object({
  results: z.array(EdgeSearchResultSchema),
  totalHits: z.number().int().nonnegative(),
  queryTimeMs: z.number().nonnegative(),
  searchMode: z.enum(["fts_only", "vector_only", "hybrid"]),
});

export type EdgeSearchResponse = z.infer<typeof EdgeSearchResponseSchema>;

export interface FTSProvider {
  index(documentId: string, title: string, content: string): Promise<void>;
  remove(documentId: string): Promise<void>;
  search(
    query: string,
    limit: number
  ): Promise<Array<{ documentId: string; score: number }>>;
  clear(): Promise<void>;
  documentCount(): Promise<number>;
}

export interface VectorProvider {
  upsert(documentId: string, vector: Float32Array): Promise<void>;
  remove(documentId: string): Promise<void>;
  search(
    queryVector: Float32Array,
    limit: number
  ): Promise<Array<{ documentId: string; score: number }>>;
  clear(): Promise<void>;
  documentCount(): Promise<number>;
}

export interface EdgeDocumentStore {
  put(documentId: string, document: EdgeDocumentRecord): Promise<void>;
  get(documentId: string): Promise<EdgeDocumentRecord | undefined>;
  delete(documentId: string): Promise<void>;
  has(documentId: string): Promise<boolean>;
  list(options?: EdgeDocumentListOptions): Promise<EdgeDocumentRecord[]>;
  count(): Promise<number>;
  clear(): Promise<void>;
}

export const EdgeDocumentRecordSchema = z.object({
  documentId: z.string(),
  connectorId: z.string(),
  title: z.string(),
  content: z.string(),
  documentType: z.string().optional(),
  checksum: z.string().optional(),
  embedding: z.instanceof(Float32Array).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type EdgeDocumentRecord = z.infer<typeof EdgeDocumentRecordSchema>;

export const EdgeDocumentListOptionsSchema = z.object({
  connectorId: z.string().optional(),
  documentType: z.string().optional(),
  limit: z.number().int().positive().default(100),
  offset: z.number().int().nonnegative().default(0),
});

export type EdgeDocumentListOptions = z.infer<
  typeof EdgeDocumentListOptionsSchema
>;
