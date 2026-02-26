import {
  keepPreviousData,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useMemo, useRef } from "react";
import { useTRPC } from "../../../lib/trpc";
import type {
  Connector,
  ConnectorStats,
  ConnectorsResult,
  MutationCallbacks,
} from "../types";

export function useConnectors(): ConnectorsResult {
  const trpc = useTRPC();

  const appsQuery = useQuery({
    ...trpc.apps.list.queryOptions(),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });

  const connectors = useMemo(
    () =>
      appsQuery.data?.filter((app) => typeof app.connectorId === "string") ??
      [],
    [appsQuery.data]
  );

  const previousConnectorIdsRef = useRef<string[]>([]);
  const connectorIds = useMemo(() => {
    const ids = connectors.map((c) => c.connectorId as string);
    if (ids.length > 0) {
      previousConnectorIdsRef.current = ids;
    }
    return ids.length > 0 ? ids : previousConnectorIdsRef.current;
  }, [connectors]);

  const previousConnectorsRef = useRef<typeof connectors>([]);
  if (connectors.length > 0) {
    previousConnectorsRef.current = connectors;
  }
  const stableConnectors =
    connectors.length > 0 ? connectors : previousConnectorsRef.current;

  const statusQueries = useQueries({
    queries: connectorIds.map((connectorId) => ({
      ...trpc.apps.getSyncStatus.queryOptions({ connectorId }),
      enabled: connectorIds.length > 0,
      placeholderData: keepPreviousData,
      staleTime: 30_000,
      gcTime: 5 * 60_000,
    })),
  });

  const connectorsData = useMemo<Connector[] | null>(() => {
    if (!stableConnectors.length) {
      return null;
    }

    const statusMap = new Map(
      statusQueries
        .map((r) => r.data)
        .filter((d): d is NonNullable<typeof d> => d !== undefined)
        .map((status) => [status.connector.id, status])
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
  }, [stableConnectors, statusQueries]);

  return {
    data: connectorsData,
    isLoading: appsQuery.isLoading || statusQueries.some((r) => r.isLoading),
    isFetching: appsQuery.isFetching || statusQueries.some((r) => r.isFetching),
    error: appsQuery.error ?? statusQueries.find((r) => r.error)?.error ?? null,
    refetch: () => {
      appsQuery.refetch();
      for (const q of statusQueries) {
        q.refetch();
      }
    },
  };
}

export function useConnectorsStats(): {
  data: ConnectorStats;
  isLoading: boolean;
} {
  const { data, isLoading } = useConnectors();

  const stats = useMemo<ConnectorStats>(() => {
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

function invalidateConnectorsQueries(
  trpc: ReturnType<typeof useTRPC>,
  queryClient: ReturnType<typeof useQueryClient>,
  connectorIds: string[]
) {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: trpc.apps.list.queryOptions().queryKey,
    }),
    ...connectorIds.map((connectorId) =>
      queryClient.invalidateQueries({
        queryKey: trpc.apps.getSyncStatus.queryOptions({ connectorId })
          .queryKey,
      })
    ),
  ]);
}

export function useTriggerSync(callbacks?: MutationCallbacks) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.apps.triggerSync.mutationOptions(),
    onSuccess: async (_data, variables) => {
      await invalidateConnectorsQueries(trpc, queryClient, [
        variables.connectorId,
      ]);
      callbacks?.onSuccess?.();
    },
    onError: (error) => {
      callbacks?.onError?.(error);
    },
  });
}

export function usePauseConnector(callbacks?: MutationCallbacks) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (connectorId: string) => {
      const { mutationFn } = trpc.apps.pauseConnector.mutationOptions();
      return (
        mutationFn as (input: { connectorId: string }) => Promise<unknown>
      )({ connectorId });
    },
    onSuccess: async (_data, connectorId) => {
      await invalidateConnectorsQueries(trpc, queryClient, [connectorId]);
      callbacks?.onSuccess?.();
    },
    onError: (error) => {
      callbacks?.onError?.(error);
    },
  });
}

export function useResumeConnector(callbacks?: MutationCallbacks) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (connectorId: string) => {
      const { mutationFn } = trpc.apps.resumeConnector.mutationOptions();
      return (
        mutationFn as (input: { connectorId: string }) => Promise<unknown>
      )({ connectorId });
    },
    onSuccess: async (_data, connectorId) => {
      await invalidateConnectorsQueries(trpc, queryClient, [connectorId]);
      callbacks?.onSuccess?.();
    },
    onError: (error) => {
      callbacks?.onError?.(error);
    },
  });
}

export function useDisconnectConnector(callbacks?: MutationCallbacks) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (appId: string) => {
      const { mutationFn } = trpc.apps.disconnect.mutationOptions();
      return (mutationFn as (input: { appId: string }) => Promise<unknown>)({
        appId,
      });
    },
    onSuccess: async (_data, appId) => {
      await invalidateConnectorsQueries(trpc, queryClient, [appId]);
      callbacks?.onSuccess?.();
    },
    onError: (error) => {
      callbacks?.onError?.(error);
    },
  });
}

export function useRestoreConnector(callbacks?: MutationCallbacks) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (appId: string) => {
      const { mutationFn } = trpc.apps.restore.mutationOptions();
      return (mutationFn as (input: { appId: string }) => Promise<unknown>)({
        appId,
      });
    },
    onSuccess: async (_data, appId) => {
      await invalidateConnectorsQueries(trpc, queryClient, [appId]);
      callbacks?.onSuccess?.();
    },
    onError: (error) => {
      callbacks?.onError?.(error);
    },
  });
}
