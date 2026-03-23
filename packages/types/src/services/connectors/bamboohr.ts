import { z } from "zod";

export const BambooHRSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  forceFullSync: z.boolean().optional(),
});

export type BambooHRSyncCursor = z.infer<typeof BambooHRSyncCursorSchema>;

export interface BambooHRTransformContext {
  connectorId: string;
  connectorType: string;
  teamId: string;
  workspaceId: string;
  subdomain: string;
}

export interface BambooHRSyncBatch<T> {
  items: T[];
  cursor: BambooHRSyncCursor;
  stage: string;
  hasMore: boolean;
}

export interface BambooHRClientConfig {
  connectorId: string;
  apiKey: string;
  subdomain: string;
  timeout?: number;
}
