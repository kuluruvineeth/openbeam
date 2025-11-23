"use client";

import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

type MutationCallbacks = {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
};

type QueryOptions = {
  enabled?: boolean;
};

/**
 * Query hook for sync status with auto-polling.
 * Polls every 2 seconds when syncing, otherwise every 10 seconds.
 */
export function useSyncStatus(
  connectorId: string | undefined,
  options?: QueryOptions
) {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.apps.getSyncStatus.queryOptions({
      connectorId: connectorId ?? "",
    }),
    enabled: !!connectorId && options?.enabled !== false,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) {
        return false;
      }
      const isSyncing =
        data.connector.status === "SYNCING" ||
        data.latestSync?.status === "SYNCING";
      // Poll every 2s when syncing, every 10s otherwise for real-time updates
      return isSyncing ? 2000 : 10_000;
    },
    staleTime: 1000,
  });
}

/**
 * Infinite Query hook for sync history.
 */
export function useSyncHistoryInfinite(
  connectorId: string | undefined,
  options?: {
    limit?: number;
    enabled?: boolean;
  }
) {
  const trpc = useTRPC();

  return useInfiniteQuery({
    ...trpc.apps.getSyncHistory.infiniteQueryOptions(
      {
        connectorId: connectorId ?? "",
        limit: options?.limit ?? 20,
      },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      }
    ),
    enabled: !!connectorId && options?.enabled !== false,
    staleTime: 10_000,
  });
}

/**
 * Query hook for sync history with pagination.
 */
export function useSyncHistory(
  connectorId: string | undefined,
  options?: {
    limit?: number;
    offset?: number;
    enabled?: boolean;
  }
) {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.apps.getSyncHistory.queryOptions({
      connectorId: connectorId ?? "",
      limit: options?.limit ?? 20,
      offset: options?.offset ?? 0,
    }),
    enabled: !!connectorId && options?.enabled !== false,
    staleTime: 10_000,
  });
}

/**
 * Helper to invalidate sync-related queries for a connector.
 * Only invalidates sync status and history - not apps.list to prevent data flicker.
 */
function invalidateSyncQueries(
  trpc: ReturnType<typeof useTRPC>,
  queryClient: ReturnType<typeof useQueryClient>,
  connectorId: string
) {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: trpc.apps.getSyncStatus.queryOptions({ connectorId }).queryKey,
    }),
    queryClient.invalidateQueries({
      queryKey: trpc.apps.getSyncHistory.queryOptions({
        connectorId,
        limit: 20,
        offset: 0,
      }).queryKey,
    }),
  ]);
}

/**
 * Mutation hook for triggering a sync.
 * Invalidates sync status, history, and apps list on success.
 */
export function useTriggerSync(callbacks?: MutationCallbacks) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.apps.triggerSync.mutationOptions(),
    onSuccess: async (_data, variables) => {
      await invalidateSyncQueries(trpc, queryClient, variables.connectorId);
      callbacks?.onSuccess?.();
    },
    onError: (error) => {
      callbacks?.onError?.(error);
    },
  });
}

/**
 * Mutation hook for pausing a connector.
 * Invalidates sync status and apps list on success (pause changes connector status).
 */
export function usePauseConnector(callbacks?: MutationCallbacks) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.apps.pauseConnector.mutationOptions(),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: trpc.apps.getSyncStatus.queryOptions({
            connectorId: variables.connectorId,
          }).queryKey,
        }),
        // Invalidate apps.list because pause changes connector status
        queryClient.invalidateQueries({
          queryKey: trpc.apps.list.queryOptions().queryKey,
        }),
      ]);
      callbacks?.onSuccess?.();
    },
    onError: (error) => {
      callbacks?.onError?.(error);
    },
  });
}

/**
 * Mutation hook for resuming a connector.
 * Invalidates sync status and apps list on success (resume changes connector status).
 */
export function useResumeConnector(callbacks?: MutationCallbacks) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.apps.resumeConnector.mutationOptions(),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: trpc.apps.getSyncStatus.queryOptions({
            connectorId: variables.connectorId,
          }).queryKey,
        }),
        // Invalidate apps.list because resume changes connector status
        queryClient.invalidateQueries({
          queryKey: trpc.apps.list.queryOptions().queryKey,
        }),
      ]);
      callbacks?.onSuccess?.();
    },
    onError: (error) => {
      callbacks?.onError?.(error);
    },
  });
}

/**
 * Query hook for bulk sync status across multiple connectors.
 * Uses parallel queries with auto-polling when any connector is syncing.
 */
export function useBulkSyncStatus(
  connectorIds: string[],
  options?: QueryOptions
) {
  const trpc = useTRPC();

  const queryResults = useQueries({
    queries: connectorIds.map((connectorId) => ({
      ...trpc.apps.getSyncStatus.queryOptions({ connectorId }),
      enabled:
        connectorIds.length > 0 &&
        options?.enabled !== false &&
        connectorIds.includes(connectorId),
      placeholderData: keepPreviousData,
      refetchInterval: (query: {
        state: {
          data:
            | {
                connector: { status: string };
                latestSync: { status: string } | null;
              }
            | undefined;
        };
      }) => {
        const queryData = query.state.data;
        if (!queryData) {
          return false;
        }
        const isSyncing =
          queryData.connector.status === "SYNCING" ||
          queryData.latestSync?.status === "SYNCING";
        return isSyncing ? 3000 : 30_000;
      },
      staleTime: 1000,
    })),
  });

  const data = queryResults
    .map((result) => result.data)
    .filter(
      (resultData): resultData is NonNullable<typeof resultData> =>
        resultData !== undefined
    );

  return {
    data,
    isLoading: queryResults.some((result) => result.isLoading),
    isFetching: queryResults.some((result) => result.isFetching),
    error: queryResults.find((result) => result.error)?.error,
    refetch: () => {
      Promise.all(queryResults.map((result) => result.refetch())).catch(() => {
        // Silently handle refetch errors
      });
    },
  };
}

/**
 * Mutation hook for updating sync settings.
 * Invalidates sync status on success.
 */
export function useUpdateSyncSettings(callbacks?: MutationCallbacks) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.apps.updateSyncSettings.mutationOptions(),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: trpc.apps.getSyncStatus.queryOptions({
          connectorId: variables.connectorId,
        }).queryKey,
      });
      callbacks?.onSuccess?.();
    },
    onError: (error) => {
      callbacks?.onError?.(error);
    },
  });
}

/**
 * Query hook for webhook status.
 */
export function useWebhookStatus(
  connectorId: string | undefined,
  options?: QueryOptions
) {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.apps.getWebhookStatus.queryOptions({
      connectorId: connectorId ?? "",
    }),
    enabled: !!connectorId && options?.enabled !== false,
    staleTime: 30_000, // Cache for 30 seconds
  });
}
