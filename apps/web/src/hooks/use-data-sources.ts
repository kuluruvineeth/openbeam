"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useMemo, useRef } from "react";
import { useTRPC } from "@/trpc/client";
import { useBulkSyncStatus } from "./use-sync";

type DataSource = {
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

type DataSourcesResult = {
  data: DataSource[] | null;
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
  refetch: () => void;
};

type MutationCallbacks = {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
};

/**
 * Query hook for data sources (connectors with sync status).
 * Combines apps list with bulk sync status for all installed connectors.
 * Uses placeholderData to prevent UI flicker during refetch.
 */
export function useDataSources(): DataSourcesResult {
  const trpc = useTRPC();

  const appsQuery = useQuery({
    ...trpc.apps.list.queryOptions(),
    placeholderData: keepPreviousData,
  });

  // Extract installed connectors - placeholderData keeps this stable during refetch
  const connectors = useMemo(
    () =>
      appsQuery.data?.filter(
        (app) => app.installed && typeof app.connectorId === "string"
      ) ?? [],
    [appsQuery.data]
  );

  // Keep connectorIds stable during refetch to prevent bulkStatusQuery from being disabled
  const previousConnectorIdsRef = useRef<string[]>([]);
  const connectorIds = useMemo(() => {
    const ids = connectors.map((c) => c.connectorId as string);
    // Update ref when we have new IDs
    if (ids.length > 0) {
      previousConnectorIdsRef.current = ids;
    }
    // Use previous IDs if current is empty (during refetch) to keep query enabled
    return ids.length > 0 ? ids : previousConnectorIdsRef.current;
  }, [connectors]);

  // Keep connectors stable for dataSources memo
  const previousConnectorsRef = useRef<typeof connectors>([]);
  if (connectors.length > 0) {
    previousConnectorsRef.current = connectors;
  }
  const stableConnectors =
    connectors.length > 0 ? connectors : previousConnectorsRef.current;

  const bulkStatusQuery = useBulkSyncStatus(connectorIds, {
    enabled: connectorIds.length > 0 && !appsQuery.isError,
  });

  // Combine connectors with their sync status
  // Use stableConnectors to prevent data from disappearing during refetch
  const dataSources = useMemo<DataSource[] | null>(() => {
    if (!stableConnectors.length) {
      return null;
    }

    const statusMap = new Map(
      bulkStatusQuery.data?.map((status) => [status.connector.id, status]) ?? []
    );

    return stableConnectors.map((connector) => {
      const connectorId = connector.connectorId as string;
      const syncStatus = statusMap.get(connectorId);

      return {
        id: connectorId,
        name: connector.name,
        app: connector.id,
        status: syncStatus?.connector.status ?? connector.status ?? "ACTIVE",
        lastSyncedAt: syncStatus?.connector.lastSyncedAt ?? null,
        syncStatus: syncStatus
          ? {
              connector: {
                id: syncStatus.connector.id,
                status: syncStatus.connector.status,
                lastSyncedAt: syncStatus.connector.lastSyncedAt,
                lastError: syncStatus.connector.lastError,
              },
              stats: {
                totalIndexed: syncStatus.stats.totalIndexed,
              },
            }
          : null,
      };
    });
  }, [stableConnectors, bulkStatusQuery.data]);

  return {
    data: dataSources,
    isLoading: appsQuery.isLoading || bulkStatusQuery.isLoading,
    isFetching: appsQuery.isFetching || bulkStatusQuery.isFetching,
    error: appsQuery.error ?? bulkStatusQuery.error,
    refetch: () => {
      Promise.all([appsQuery.refetch(), bulkStatusQuery.refetch()]).catch(
        () => {
          // Silently handle refetch errors
        }
      );
    },
  };
}

/**
 * Query hook for data sources statistics.
 * Derived from useDataSources for aggregated stats.
 */
export function useDataSourcesStats() {
  const { data, isLoading } = useDataSources();

  const stats = useMemo(() => {
    if (!data?.length) {
      return {
        totalConnectors: 0,
        activeConnectors: 0,
        syncingConnectors: 0,
        totalDocuments: 0,
      };
    }

    return {
      totalConnectors: data.length,
      activeConnectors: data.filter((s) => s.status === "ACTIVE").length,
      syncingConnectors: data.filter((s) => s.status === "SYNCING").length,
      totalDocuments: data.reduce(
        (sum, s) => sum + (s.syncStatus?.stats.totalIndexed ?? 0),
        0
      ),
    };
  }, [data]);

  return { data: stats, isLoading };
}

/**
 * Helper to invalidate data sources related queries.
 */
async function invalidateDataSourcesQueries(
  trpc: ReturnType<typeof useTRPC>,
  queryClient: ReturnType<typeof useQueryClient>,
  connectorIds: string[]
) {
  await Promise.all([
    // Invalidate apps list (which data sources depends on)
    queryClient.invalidateQueries({
      queryKey: trpc.apps.list.queryOptions().queryKey,
    }),
    // Invalidate sync status for all affected connectors
    ...connectorIds.map((connectorId) =>
      queryClient.invalidateQueries({
        queryKey: trpc.apps.getSyncStatus.queryOptions({ connectorId })
          .queryKey,
      })
    ),
  ]);
}

/**
 * Mutation hook for bulk sync operation.
 * Triggers sync for multiple connectors in parallel.
 */
export function useBulkSync(callbacks?: MutationCallbacks) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (connectorIds: string[]) => {
      const mutationFn = trpc.apps.triggerSync.mutationOptions().mutationFn;
      if (!mutationFn) {
        throw new Error("triggerSync mutation function not available");
      }
      // Call mutationFn for each connector
      // mutationFn requires (input, context) but context can be empty for client-side calls
      const mutations = connectorIds.map((connectorId) =>
        (
          mutationFn as (input: {
            connectorId: string;
            type: "FULL";
          }) => Promise<unknown>
        )({ connectorId, type: "FULL" })
      );
      return Promise.all(mutations);
    },
    onSuccess: async (_data, connectorIds) => {
      await invalidateDataSourcesQueries(trpc, queryClient, connectorIds);
      callbacks?.onSuccess?.();
    },
    onError: (error) => {
      callbacks?.onError?.(error);
    },
  });
}

/**
 * Mutation hook for bulk pause operation.
 * Pauses multiple connectors in parallel.
 */
export function useBulkPause(callbacks?: MutationCallbacks) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (connectorIds: string[]) => {
      const mutationFn = trpc.apps.pauseConnector.mutationOptions().mutationFn;
      if (!mutationFn) {
        throw new Error("pauseConnector mutation function not available");
      }
      const mutations = connectorIds.map((connectorId) =>
        (mutationFn as (input: { connectorId: string }) => Promise<unknown>)({
          connectorId,
        })
      );
      return Promise.all(mutations);
    },
    onSuccess: async (_data, connectorIds) => {
      await invalidateDataSourcesQueries(trpc, queryClient, connectorIds);
      callbacks?.onSuccess?.();
    },
    onError: (error) => {
      callbacks?.onError?.(error);
    },
  });
}

/**
 * Mutation hook for bulk resume operation.
 * Resumes multiple connectors in parallel.
 */
export function useBulkResume(callbacks?: MutationCallbacks) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (connectorIds: string[]) => {
      const mutationFn = trpc.apps.resumeConnector.mutationOptions().mutationFn;
      if (!mutationFn) {
        throw new Error("resumeConnector mutation function not available");
      }
      const mutations = connectorIds.map((connectorId) =>
        (mutationFn as (input: { connectorId: string }) => Promise<unknown>)({
          connectorId,
        })
      );
      return Promise.all(mutations);
    },
    onSuccess: async (_data, connectorIds) => {
      await invalidateDataSourcesQueries(trpc, queryClient, connectorIds);
      callbacks?.onSuccess?.();
    },
    onError: (error) => {
      callbacks?.onError?.(error);
    },
  });
}
