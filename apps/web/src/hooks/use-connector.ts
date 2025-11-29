"use client";

import type { UnifiedApp } from "@openplane/integrations";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { useSyncHistoryInfinite, useSyncStatus } from "./use-sync";

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
  // App definition for display purposes
  definition?: UnifiedApp | null;
  // OAuth provider if included
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

export function useConnector(connectorId: string | undefined) {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.apps.get.queryOptions({ appId: connectorId ?? "" }),
    enabled: !!connectorId,
    select: (data) => data as unknown as ConnectorDetail,
  });
}

export function useConnectorResources(_connectorId: string | undefined) {
  return {
    data: [],
    isLoading: false,
    error: null,
  };
}

export function useConnectorSyncHistory(
  connectorId: string | undefined,
  options?: { limit?: number }
) {
  return useSyncHistoryInfinite(connectorId, {
    limit: options?.limit ?? 10,
    enabled: !!connectorId,
  });
}

export function useConnectorSyncStatus(connectorId: string | undefined) {
  return useSyncStatus(connectorId, {
    enabled: !!connectorId,
  });
}

export function useInvalidateConnector() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return (connectorId: string) => {
    queryClient.invalidateQueries({
      queryKey: trpc.apps.get.queryOptions({ appId: connectorId }).queryKey,
    });
    queryClient.invalidateQueries({
      queryKey: trpc.apps.getSyncStatus.queryOptions({ connectorId }).queryKey,
    });
  };
}
