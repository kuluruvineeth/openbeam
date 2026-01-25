import { z } from "zod";

export const MemoryReadNodeConfigSchema = z.object({
  key: z.string(),
  namespace: z.string().optional(),
  scope: z.enum(["workflow", "user", "team", "global"]).default("workflow"),
  defaultValue: z.unknown().optional(),
});

export type MemoryReadNodeConfig = z.infer<typeof MemoryReadNodeConfigSchema>;

export const MemoryWriteNodeConfigSchema = z.object({
  key: z.string(),
  namespace: z.string().optional(),
  scope: z.enum(["workflow", "user", "team", "global"]).default("workflow"),
  ttlMs: z.number().positive().optional(),
  overwrite: z.boolean().default(true),
});

export type MemoryWriteNodeConfig = z.infer<typeof MemoryWriteNodeConfigSchema>;

export const MemorySearchNodeConfigSchema = z.object({
  query: z.string(),
  namespace: z.string().optional(),
  scope: z.enum(["workflow", "user", "team", "global"]).default("workflow"),
  topK: z.number().positive().default(10),
  threshold: z.number().min(0).max(1).optional(),
  includeMetadata: z.boolean().default(true),
});

export type MemorySearchNodeConfig = z.infer<
  typeof MemorySearchNodeConfigSchema
>;
