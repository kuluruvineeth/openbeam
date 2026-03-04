import { z } from "zod";

export const ViamSyncCursorSchema = z.object({
  lastSyncTimestamp: z.number(),
  lastMachineSync: z.record(z.string(), z.number()),
  dataQueryCursor: z.string().optional(),
});

export type ViamSyncCursor = z.infer<typeof ViamSyncCursorSchema>;

export const ViamTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
  organizationId: z.string(),
  apiKeyId: z.string(),
});

export type ViamTransformContext = z.infer<typeof ViamTransformContextSchema>;

export const ViamSyncOptionsSchema = z.object({
  locationIds: z.array(z.string()).optional(),
  machineIds: z.array(z.string()).optional(),
  syncSensorData: z.boolean().default(true),
  sensorDataLookbackHours: z.number().default(24),
  syncActionLogs: z.boolean().default(true),
  syncMLModels: z.boolean().default(false),
});

export type ViamSyncOptions = z.infer<typeof ViamSyncOptionsSchema>;

export type ViamSyncOptionsInput = z.input<typeof ViamSyncOptionsSchema>;

export interface ViamFullSyncOptions extends ViamSyncOptionsInput {
  batchSize?: number;
  onStageChange?: (
    stage: string,
    processed: number,
    current?: string
  ) => Promise<void>;
}

export const ViamSyncBatchStatsSchema = z.object({
  processed: z.number(),
  skipped: z.number(),
  errors: z.number(),
});

export interface ViamSyncBatch<T> {
  items: T[];
  cursor: ViamSyncCursor;
  hasMore: boolean;
  stats: z.infer<typeof ViamSyncBatchStatsSchema>;
}

export interface ViamClientConfig {
  connectorId: string;
  apiKey: string;
  apiKeyId: string;
  baseUrl?: string;
  timeout?: number;
}

export interface ViamLocation {
  id: string;
  name: string;
  parentLocationId?: string;
  address?: {
    line1?: string;
    city?: string;
    state?: string;
    country?: string;
    lat?: number;
    lng?: number;
  };
  createdOn: string;
  robotCount: number;
}

export interface ViamMachine {
  id: string;
  name: string;
  locationId: string;
  status: "online" | "offline" | "unknown";
  lastAccess: string;
  createdOn: string;
  mainPartId?: string;
}

export interface ViamComponent {
  name: string;
  type: string;
  model: string;
  namespace: string;
  attributes?: Record<string, unknown>;
  dependsOn?: string[];
}

export interface ViamSensorReading {
  componentName: string;
  readings: Record<string, unknown>;
  timestamp: string;
  machineId: string;
}

export interface ViamAggregatedReading {
  componentName: string;
  machineId: string;
  startTime: number;
  endTime: number;
  count: number;
  values: Record<
    string,
    { min: number; max: number; avg: number; last: unknown }
  >;
}

export interface ViamCapture {
  id: string;
  componentName: string;
  machineId: string;
  mimeType: string;
  timestamp: string;
  tags: string[];
  annotations?: Record<string, unknown>;
}

export interface ViamMLModel {
  id: string;
  name: string;
  version: string;
  architecture: string;
  framework: string;
  createdOn: string;
  status: string;
}
