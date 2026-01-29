import { z } from "zod";

export const MemoryScopeSchema = z.enum([
  "workflow",
  "session",
  "user",
  "team",
  "global",
]);

export const MemoryTypeSchema = z.enum(["semantic", "episodic", "procedural"]);

export const MemoryEncodingSchema = z.enum(["json", "text", "embedding"]);

export const MemorySearchModeSchema = z.enum(["semantic", "keyword", "hybrid"]);

export type MemoryScope = z.infer<typeof MemoryScopeSchema>;
export type MemoryType = z.infer<typeof MemoryTypeSchema>;
export type MemoryEncoding = z.infer<typeof MemoryEncodingSchema>;
export type MemorySearchMode = z.infer<typeof MemorySearchModeSchema>;

export const MemoryReadNodeConfigSchema = z.object({
  key: z.string(),
  namespace: z.string().optional(),
  scope: MemoryScopeSchema.default("workflow"),
  defaultValue: z.unknown().optional(),
  throwOnMissing: z.boolean().default(false),
  includeMetadata: z.boolean().default(false),
});

export type MemoryReadNodeConfig = z.infer<typeof MemoryReadNodeConfigSchema>;

export const MemoryWriteNodeConfigSchema = z.object({
  key: z.string(),
  namespace: z.string().optional(),
  scope: MemoryScopeSchema.default("workflow"),
  memoryType: MemoryTypeSchema.default("semantic"),
  encoding: MemoryEncodingSchema.default("json"),
  ttlMs: z.number().positive().optional(),
  overwrite: z.boolean().default(true),
  generateEmbedding: z.boolean().default(false),
  metadata: z.record(z.string(), z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
});

export type MemoryWriteNodeConfig = z.infer<typeof MemoryWriteNodeConfigSchema>;

export const MemorySearchNodeConfigSchema = z.object({
  query: z.string(),
  namespace: z.string().optional(),
  scope: MemoryScopeSchema.default("workflow"),
  memoryTypes: z.array(MemoryTypeSchema).optional(),
  searchMode: MemorySearchModeSchema.default("hybrid"),
  topK: z.number().positive().default(10),
  threshold: z.number().min(0).max(1).optional(),
  includeMetadata: z.boolean().default(true),
  dateRange: z
    .object({
      start: z.string().optional(),
      end: z.string().optional(),
    })
    .optional(),
  tags: z.array(z.string()).optional(),
  rerank: z.boolean().default(false),
});

export type MemorySearchNodeConfig = z.infer<
  typeof MemorySearchNodeConfigSchema
>;
