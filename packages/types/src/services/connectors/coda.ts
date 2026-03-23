import { z } from "zod";

export const CodaSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  lastFullSync: z.number().optional(),
  forceFullSync: z.boolean().optional(),
});

export type CodaSyncCursor = z.infer<typeof CodaSyncCursorSchema>;

export interface CodaTransformContext {
  connectorId: string;
  connectorType: string;
  teamId: string;
  workspaceId: string;
}

export interface CodaSyncBatch<T> {
  items: T[];
  cursor: CodaSyncCursor;
  hasMore: boolean;
  stats: { processed: number; skipped: number; errors: number };
}

export interface CodaClientConfig {
  connectorId: string;
  apiKey: string;
  timeout?: number;
}
