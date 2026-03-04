import { z } from "zod";

export const SyncEventTypeSchema = z.enum([
  "upsert",
  "delete",
  "permission_change",
]);

export type SyncEventType = z.infer<typeof SyncEventTypeSchema>;

export const SyncEventSchema = z.object({
  id: z.string(),
  type: SyncEventTypeSchema,
  documentId: z.string(),
  connectorId: z.string(),
  timestamp: z.number(),
  payload: z.record(z.string(), z.unknown()).optional(),
  checksum: z.string().optional(),
  sizeBytes: z.number().int().nonnegative().optional(),
});

export type SyncEvent = z.infer<typeof SyncEventSchema>;

export const EdgeSyncCursorSchema = z.object({
  connectorId: z.string(),
  lastEventId: z.string().optional(),
  lastTimestamp: z.number().optional(),
  merkleRoot: z.string().optional(),
  fullSyncCompleted: z.boolean().default(false),
  version: z.number().int().nonnegative().default(0),
});

export type EdgeSyncCursor = z.infer<typeof EdgeSyncCursorSchema>;

export const MerkleNodeSchema: z.ZodType<MerkleNode> = z.object({
  hash: z.string(),
  key: z.string().optional(),
  level: z.number().int().nonnegative(),
  left: z.lazy(() => MerkleNodeSchema).optional(),
  right: z.lazy(() => MerkleNodeSchema).optional(),
});

export interface MerkleNode {
  hash: string;
  key?: string;
  level: number;
  left?: MerkleNode;
  right?: MerkleNode;
}

export const BandwidthPolicySchema = z.object({
  estimatedKbps: z.number().nonnegative(),
  syncMode: z.enum(["full", "incremental", "metadata_only", "manual"]),
  maxBatchSizeKb: z.number().positive(),
  compressionEnabled: z.boolean(),
});

export type BandwidthPolicy = z.infer<typeof BandwidthPolicySchema>;

export const BANDWIDTH_THRESHOLDS = {
  full: 10_000,
  incremental: 1000,
  metadata_only: 100,
  manual: 0,
} as const;
