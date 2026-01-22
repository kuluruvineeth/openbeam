import type { UnifiedApp } from "@openplane/integrations";

export type ConnectorDetail = {
  id: string;
  teamId: string;
  userId: string;
  workspaceExternalId: string;
  name: string;
  description: string | null;
  type: string;
  authType: string;
  app: string;
  config: Record<string, unknown>;
  status: string;
  statusMessage: string | null;
  statusChangedAt: Date | null;
  state: Record<string, unknown>;
  syncConfig: Record<string, unknown>;
  syncEnabled: boolean;
  syncMode: string;
  lastSyncedAt: Date | null;
  lastSyncStatus: string | null;
  lastSyncDuration: number | null;
  lastError: string | null;
  lastErrorAt: Date | null;
  totalDocuments: number;
  totalMessages: number;
  totalFiles: number;
  totalEntities: number;
  healthScore: number;
  createdAt: Date;
  updatedAt: Date;
  pausedAt: Date | null;
  definition?: UnifiedApp | null;
  oauthProvider?: {
    id: string;
    connectorId: string;
    app: string;
    accessToken: string | null;
    refreshToken: string | null;
    tokenExpiresAt: Date | null;
    oauthScopes: string[];
    createdAt: Date;
    updatedAt: Date;
  } | null;
};

export type ConnectorResource = {
  id: string;
  connectorId: string;
  externalId: string;
  resourceType: string;
  name: string | null;
  path: string | null;
  parentId: string | null;
  syncEnabled: boolean;
  syncPriority: number;
  lastSyncedAt: Date | null;
  documentCount: number;
  isPublic: boolean;
  accessControl: string[];
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
};

export type ResourceDocument = {
  id: string;
  title: string | null;
  documentType: string;
  indexedAt: Date;
  source: "document" | "file" | "media";
};

export type ResourceDocumentPage = {
  items: ResourceDocument[];
  totalCount: number;
  nextCursor: string | null;
};

export type Connector = {
  id: string;
  name: string;
  app: string;
  status: string;
  lastSyncedAt: string | Date | null;
  syncStatus: {
    connector: {
      id: string;
      status: string | null;
      lastSyncedAt: string | Date | null;
      lastError: string | null;
    };
    stats: {
      totalIndexed: number;
    };
  } | null;
};

export type ConnectorsResult = {
  data: Connector[] | null;
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
  refetch: () => void;
};

export type MutationCallbacks = {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
};
