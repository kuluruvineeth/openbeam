import { z } from "zod";

export const WorkdaySyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  forceFullSync: z.boolean().optional(),
});

export type WorkdaySyncCursor = z.infer<typeof WorkdaySyncCursorSchema>;

export interface WorkdayTransformContext {
  connectorId: string;
  connectorType: string;
  teamId: string;
  workspaceId: string;
  tenant: string;
  host: string;
}

export interface WorkdaySyncBatch<T> {
  items: T[];
  cursor: WorkdaySyncCursor;
  stage: string;
  hasMore: boolean;
}

export interface WorkdayClientConfig {
  connectorId: string;
  accessToken: string;
  tenant: string;
  host: string;
  timeout?: number;
}
