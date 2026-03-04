import { z } from "zod";

export const VERKADA_API_BASE_US = "https://api.verkada.com";
export const VERKADA_API_BASE_EU = "https://api.eu.verkada.com";
export const VERKADA_API_BASE_AU = "https://api.au.verkada.com";

export const VerkadaClientConfigSchema = z.object({
  connectorId: z.string(),
  apiKey: z.string(),
  region: z.enum(["us", "eu", "au"]).default("us"),
  timeout: z.number().optional(),
});

export type VerkadaClientConfig = z.infer<typeof VerkadaClientConfigSchema>;

export const VerkadaSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  lastFullSync: z.number().optional(),
  forceFullSync: z.boolean().optional(),
});

export type VerkadaSyncCursor = z.infer<typeof VerkadaSyncCursorSchema>;

export const VerkadaSyncOptionsSchema = z.object({
  batchSize: z.number().default(100),
  pageSize: z.number().max(200).default(100),
  syncCameras: z.boolean().default(true),
  syncDoors: z.boolean().default(true),
  syncSensors: z.boolean().default(true),
});

export type VerkadaSyncOptions = z.infer<typeof VerkadaSyncOptionsSchema>;

export interface VerkadaTransformContext {
  connectorId: string;
  connectorType: "VERKADA";
  teamId: string;
  workspaceId: string;
  organizationId: string;
  organizationName: string;
  region: "us" | "eu" | "au";
}

export interface VerkadaSyncBatch<T> {
  items: T[];
  cursor: VerkadaSyncCursor;
  stage: "cameras" | "doors" | "sensors" | "events";
  hasMore: boolean;
}
