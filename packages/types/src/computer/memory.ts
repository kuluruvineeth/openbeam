import { z } from "zod";

export const MemoryEntrySchema = z.object({
  id: z.string(),
  agentId: z.string(),
  teamId: z.string(),
  key: z.string(),
  content: z.string(),
  type: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type MemoryEntry = z.infer<typeof MemoryEntrySchema>;

export const UpsertMemoryInputSchema = z.object({
  agentId: z.string(),
  teamId: z.string(),
  key: z.string().min(1).max(255),
  content: z.string().min(1),
  type: z.string().max(100).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type UpsertMemoryInput = z.infer<typeof UpsertMemoryInputSchema>;

export const MemoryQuerySchema = z.object({
  agentId: z.string(),
  teamId: z.string(),
  key: z.string().optional(),
  type: z.string().optional(),
});
export type MemoryQuery = z.infer<typeof MemoryQuerySchema>;
