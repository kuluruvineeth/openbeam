import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc";
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

      const syncing =
        data.connector.status === "SYNCING" ||
        data.latestSync?.status === "RUNNING";
      const processing =
        (data.processing?.filesProcessing ?? 0) > 0 ||
        (data.processing?.mediaProcessing ?? 0) > 0;

      if (syncing) {
        return 2000;
      }
      if (processing) {
        return 5000;
      }
      return 30_000;
    },
    staleTime: 1000,
  });
}

export function useSyncHistoryInfinite(
  connectorId: string | undefined,
  options?: { limit?: number; enabled?: boolean }
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
  options?: { limit?: number; offset?: number; enabled?: boolean }
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
