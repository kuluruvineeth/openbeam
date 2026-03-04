import { z } from "zod";

export const NodeRedConnectionConfigSchema = z.object({
  connectorId: z.string(),
  baseUrl: z.string(),
  accessToken: z.string(),
  timeout: z.number().default(30_000),
});

export type NodeRedConnectionConfig = z.infer<
  typeof NodeRedConnectionConfigSchema
>;

export const NodeRedSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  lastFlowRevision: z.string().optional(),
});

export type NodeRedSyncCursor = z.infer<typeof NodeRedSyncCursorSchema>;

export interface NodeRedSyncOptions {
  cursor?: NodeRedSyncCursor;
  batchSize?: number;
  forceFullSync?: boolean;
  syncNodes?: boolean;
  syncSettings?: boolean;
}

export interface NodeRedTransformContext {
  connectorId: string;
  connectorType: string;
  teamId: string;
  workspaceId: string;
  baseUrl: string;
}

export interface NodeRedFlow {
  id: string;
  type: string;
  label?: string;
  disabled?: boolean;
  info?: string;
  env?: Array<{ name: string; value: string; type: string }>;
}

export interface NodeRedNode {
  id: string;
  type: string;
  z?: string;
  name?: string;
  x?: number;
  y?: number;
  wires?: string[][];
  [key: string]: unknown;
}

export interface NodeRedNodeType {
  id: string;
  name: string;
  types: string[];
  enabled: boolean;
  local: boolean;
  module: string;
  version: string;
}

export interface NodeRedSettings {
  httpNodeRoot: string;
  version: string;
  paletteCategories: string[];
  flowFilePretty: boolean;
  [key: string]: unknown;
}

export interface NodeRedSyncBatch<T> {
  items: T[];
  cursor: NodeRedSyncCursor;
  hasMore: boolean;
  stage: string;
}
