import { z } from "zod";

export const OmniverseSyncCursorSchema = z.object({
  lastSyncTimestamp: z.number(),
  lastModifiedVersion: z.string().optional(),
  scannedStages: z.array(z.string()),
  currentStageIndex: z.number(),
});

export type OmniverseSyncCursor = z.infer<typeof OmniverseSyncCursorSchema>;

export const OmniverseTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
  nucleusUrl: z.string(),
  projectPath: z.string(),
});

export type OmniverseTransformContext = z.infer<
  typeof OmniverseTransformContextSchema
>;

export const OmniverseSyncOptionsSchema = z.object({
  stagePaths: z.array(z.string()),
  primTypeFilters: z.array(z.string()).optional(),
  depthLimit: z.number().optional(),
  includeInactive: z.boolean().optional(),
  spatialBoundsFilter: z
    .object({
      min: z.tuple([z.number(), z.number(), z.number()]),
      max: z.tuple([z.number(), z.number(), z.number()]),
    })
    .optional(),
});

export type OmniverseSyncOptions = z.infer<typeof OmniverseSyncOptionsSchema>;

export interface OmniverseFullSyncOptions extends OmniverseSyncOptions {
  batchSize?: number;
  onStageChange?: (
    stage: string,
    processed: number,
    current?: string
  ) => Promise<void>;
}

export const OmniverseSyncBatchStatsSchema = z.object({
  processed: z.number(),
  skipped: z.number(),
  errors: z.number(),
});

export interface OmniverseSyncBatch<T> {
  items: T[];
  cursor: OmniverseSyncCursor;
  hasMore: boolean;
  stats: z.infer<typeof OmniverseSyncBatchStatsSchema>;
}

export interface OmniverseClientConfig {
  connectorId: string;
  nucleusUrl: string;
  apiToken: string;
  timeout?: number;
}

export const PrimClassSchema = z.enum([
  "Xform",
  "Mesh",
  "Camera",
  "Light",
  "Material",
  "Scope",
  "Shader",
  "SkelRoot",
]);

export type PrimClass = z.infer<typeof PrimClassSchema>;

export interface ParsedPrim {
  path: string;
  name: string;
  typeName: string;
  parentPath?: string;
  isActive: boolean;
  transform?: {
    translate: [number, number, number];
    rotate: [number, number, number, number];
    scale: [number, number, number];
  };
  bounds?: {
    min: [number, number, number];
    max: [number, number, number];
  };
  properties: Record<string, unknown>;
  customData: Record<string, unknown>;
  assetInfo?: {
    identifier?: string;
    version?: string;
  };
  relationships: string[];
}

export interface PrimRelationship {
  sourcePath: string;
  targetPath: string;
  name: string;
}

export interface UsdStageParseResult {
  stagePath: string;
  prims: ParsedPrim[];
  relationships: PrimRelationship[];
  rootPrimCount: number;
}

export interface NucleusFileInfo {
  path: string;
  modifiedTime: string;
  createdTime: string;
  size: number;
  isFolder: boolean;
  version?: string;
}

export const OmniverseDocumentType = {
  ASSET: "digital_twin_asset",
  ZONE: "digital_twin_zone",
  SENSOR: "digital_twin_sensor",
  ANNOTATION: "digital_twin_annotation",
  MATERIAL: "digital_twin_material",
} as const;

export type OmniverseDocumentType =
  (typeof OmniverseDocumentType)[keyof typeof OmniverseDocumentType];
