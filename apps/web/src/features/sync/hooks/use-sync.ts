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
import type { ProcessingStatus } from "../lib/sync-types";

type MutationCallbacks = {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
};

type QueryOptions = {
  enabled?: boolean;
};

type SyncStatusData = {
  connector: { status: string };
  latestSync?: { status: string } | null;
  processing?: ProcessingStatus;
};

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
      const data = query.state.data as SyncStatusData | undefined;
      if (!data) {
        return false;
      }

      const isSyncing =
        data.connector.status === "SYNCING" ||
        data.latestSync?.status === "RUNNING";
      const isProcessing =
        (data.processing?.filesProcessing ?? 0) > 0 ||
        (data.processing?.mediaProcessing ?? 0) > 0;

      if (isSyncing) {
        return 2000;
      }
      if (isProcessing) {
        return 5000;
      }
      return 30_000;
    },
    staleTime: 1000,
  });
}

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
                processing?: {
                  filesProcessing: number;
                  mediaProcessing: number;
                };
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
          queryData.latestSync?.status === "RUNNING";
        const isProcessing =
          (queryData.processing?.filesProcessing ?? 0) > 0 ||
          (queryData.processing?.mediaProcessing ?? 0) > 0;

        if (isSyncing) {
          return 3000;
        }
        if (isProcessing) {
          return 5000;
        }
        return 30_000;
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
    staleTime: 30_000,
  });
}
