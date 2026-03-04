import { z } from "zod";

export const MatterportSyncCursorSchema = z.object({
  lastSyncTimestamp: z.number(),
  lastModelModified: z.record(z.string(), z.string()),
  processedModelIds: z.array(z.string()),
});

export type MatterportSyncCursor = z.infer<typeof MatterportSyncCursorSchema>;

export const MatterportTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
  apiEndpoint: z.string(),
});

export type MatterportTransformContext = z.infer<
  typeof MatterportTransformContextSchema
>;

export const MatterportSyncOptionsSchema = z.object({
  modelIds: z.array(z.string()).optional(),
  includePointCloud: z.boolean().default(false),
  includeFloorPlans: z.boolean().default(true),
  mattertagDepth: z.enum(["metadata", "full"]).default("full"),
});

export type MatterportSyncOptions = z.infer<typeof MatterportSyncOptionsSchema>;

export type MatterportSyncOptionsInput = z.input<
  typeof MatterportSyncOptionsSchema
>;

export interface MatterportFullSyncOptions extends MatterportSyncOptionsInput {
  batchSize?: number;
  onStageChange?: (
    stage: string,
    processed: number,
    current?: string
  ) => Promise<void>;
}

export const MatterportSyncBatchStatsSchema = z.object({
  processed: z.number(),
  skipped: z.number(),
  errors: z.number(),
});

export interface MatterportSyncBatch<T> {
  items: T[];
  cursor: MatterportSyncCursor;
  hasMore: boolean;
  stats: z.infer<typeof MatterportSyncBatchStatsSchema>;
}

export interface MatterportClientConfig {
  connectorId: string;
  tokenId: string;
  tokenSecret: string;
  timeout?: number;
}

export interface MatterportAddress {
  line1?: string;
  city?: string;
  state?: string;
  country?: string;
  lat?: number;
  lng?: number;
}

export interface MatterportModel {
  id: string;
  name: string;
  description?: string;
  address?: MatterportAddress;
  created: string;
  modified: string;
  status: string;
  visibility: string;
  summary?: {
    rooms: number;
    floors: number;
    area: number;
  };
}

export interface MatterportFloor {
  id: string;
  label: string;
  rooms: MatterportRoom[];
}

export interface MatterportRoom {
  id: string;
  label: string;
  floorArea: number;
  floorPosition: { x: number; y: number; z: number };
  center: { x: number; y: number; z: number };
  bounds: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  };
  floor?: { id: string; label: string };
}

export interface MatterportMattertag {
  id: string;
  label: string;
  description?: string;
  position: { x: number; y: number; z: number };
  anchorNormal?: { x: number; y: number; z: number };
  color?: string;
  mediaType?: string;
  mediaSrc?: string;
}

export interface MatterportSweep {
  id: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  floor?: { id: string; label: string };
  room?: { id: string; label: string };
  neighbors: string[];
}
