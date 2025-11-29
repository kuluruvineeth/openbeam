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

type Connector = {
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

type ConnectorsResult = {
  data: Connector[] | null;
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
  refetch: () => void;
};

type MutationCallbacks = {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
};

export function useConnectors(): ConnectorsResult {
  const trpc = useTRPC();

  const appsQuery = useQuery({
    ...trpc.apps.list.queryOptions(),
    placeholderData: keepPreviousData,
  });

  const connectors = useMemo(
    () =>
      appsQuery.data?.filter(
        (app) => app.installed && typeof app.connectorId === "string"
      ) ?? [],
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

  const bulkStatusQuery = useBulkSyncStatus(connectorIds, {
    enabled: connectorIds.length > 0 && !appsQuery.isError,
  });

  const connectorsData = useMemo<Connector[] | null>(() => {
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
    data: connectorsData,
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

export function useConnectorsStats() {
  const { data, isLoading } = useConnectors();

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

async function invalidateConnectorsQueries(
  trpc: ReturnType<typeof useTRPC>,
  queryClient: ReturnType<typeof useQueryClient>,
  connectorIds: string[]
) {
  await Promise.all([
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

export function useBulkSync(callbacks?: MutationCallbacks) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (connectorIds: string[]) => {
      const mutationFn = trpc.apps.triggerSync.mutationOptions().mutationFn;
      if (!mutationFn) {
        throw new Error("triggerSync mutation function not available");
      }
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
      await invalidateConnectorsQueries(trpc, queryClient, connectorIds);
      callbacks?.onSuccess?.();
    },
    onError: (error) => {
      callbacks?.onError?.(error);
    },
  });
}

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
      await invalidateConnectorsQueries(trpc, queryClient, connectorIds);
      callbacks?.onSuccess?.();
    },
    onError: (error) => {
      callbacks?.onError?.(error);
    },
  });
}

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
      await invalidateConnectorsQueries(trpc, queryClient, connectorIds);
      callbacks?.onSuccess?.();
    },
    onError: (error) => {
      callbacks?.onError?.(error);
    },
  });
}
