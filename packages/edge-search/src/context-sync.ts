import type { ContextSearchResult } from "@openbeam/types/context";

export interface EdgeContextSyncParams {
  serverUrl: string;
  teamId: string;
  scopes: string[];
  cursor?: string;
}

export interface EdgeContextSyncResult {
  synced: number;
  cursor: string;
}

export interface EdgeContextSync {
  pullContext(params: EdgeContextSyncParams): Promise<EdgeContextSyncResult>;
  searchLocal(
    query: string,
    options?: { limit?: number }
  ): Promise<ContextSearchResult[]>;
}
