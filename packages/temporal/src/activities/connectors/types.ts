import type { ConnectorStatus } from "@openbeam/db";
import type { SyncCursor } from "../../workflows/types";

export interface ConnectorRecord {
  id: string;
  type: string;
  teamId: string;
  status: ConnectorStatus;
  workspaceExternalId: string;
  syncMode: string;
  lastSyncedAt: Date | null;
  config: Record<string, unknown>;
  oauthProvider?: {
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
  };
  disabledResourceIds?: string[];
}

export interface FetchBatchInput {
  connector: ConnectorRecord;
  cursor?: SyncCursor;
  batchSize: number;
  syncType?: "FULL" | "INCREMENTAL" | "PERMISSIONS";
}

export interface DiscoveredResourceRecord {
  externalId: string;
  resourceType: string;
  name?: string;
  path?: string;
  parentId?: string;
  isPublic?: boolean;
  metadata?: Record<string, unknown>;
}

export interface FetchBatchOutput {
  items: unknown[];
  nextCursor?: SyncCursor;
  hasMore: boolean;
  rateLimitRemaining?: number;
  discoveredResources?: DiscoveredResourceRecord[];
  progressMessage?: string;
}

export interface BaseConnectorActivities {
  loadConnector(connectorId: string): Promise<ConnectorRecord>;
}

export interface ConnectorSyncActivities {
  fetchBatch(input: FetchBatchInput): Promise<FetchBatchOutput>;
}

export interface ConnectorOAuthActivities {
  refreshOAuthToken(connectorId: string): Promise<{ accessToken: string }>;
}

export interface DownloadFileInput {
  connector: ConnectorRecord;
  fileId: string;
  mimeType?: string;
  metadata?: Record<string, string>;
}

export interface DownloadFileOutput {
  localPath: string;
  size: number;
  contentType: string;
  originalFilename?: string;
}

export interface ConnectorFileActivities {
  downloadFile(input: DownloadFileInput): Promise<DownloadFileOutput>;
}

export type ConnectorActivities = BaseConnectorActivities &
  Partial<ConnectorSyncActivities> &
  Partial<ConnectorOAuthActivities> &
  Partial<ConnectorFileActivities>;
