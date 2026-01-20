"use client";

import { useDebounce } from "@openplane/ui";
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { createLoader, parseAsString, useQueryStates } from "nuqs";
import { useCallback, useMemo } from "react";
import { useSyncHistoryInfinite, useSyncStatus } from "@/hooks/use-sync";
import { useTRPC } from "@/trpc/client";
import type { ConnectorDetail } from "../types";

export type { ConnectorDetail } from "../types";

export function useConnector(connectorId: string | undefined) {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.apps.get.queryOptions({ appId: connectorId ?? "" }),
    enabled: !!connectorId,
    select: (data) => data as unknown as ConnectorDetail,
  });
}

export const resourcesParamsSchema = {
  resourceSearch: parseAsString.withDefault(""),
};

export const loadResourcesParams = createLoader(resourcesParamsSchema);

const RESOURCES_LIMIT = 50;

export function useConnectorResources(connectorId: string | undefined) {
  const trpc = useTRPC();
  const [params, setParams] = useQueryStates(resourcesParamsSchema);
  const debouncedSearch = useDebounce(params.resourceSearch, 300);

  const resourcesQuery = useInfiniteQuery({
    ...trpc.apps.connectors.getResources.infiniteQueryOptions(
      {
        connectorId: connectorId ?? "",
        search: debouncedSearch || undefined,
        limit: RESOURCES_LIMIT,
      },
      { getNextPageParam: (lastPage) => lastPage.nextCursor }
    ),
    enabled: !!connectorId,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const resources = useMemo(
    () => resourcesQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [resourcesQuery.data?.pages]
  );

  const totalCount = resourcesQuery.data?.pages[0]?.totalCount ?? 0;
  const enabledCount = useMemo(
    () => resources.filter((r) => r.syncEnabled).length,
    [resources]
  );

  const setSearch = useCallback(
    (value: string) => setParams({ resourceSearch: value || null }),
    [setParams]
  );

  const clearSearch = useCallback(
    () => setParams({ resourceSearch: null }),
    [setParams]
  );

  return {
    resources,
    totalCount,
    enabledCount,
    search: params.resourceSearch,
    setSearch,
    clearSearch,
    isLoading: resourcesQuery.isLoading,
    isFetching: resourcesQuery.isFetching,
    isFetchingNextPage: resourcesQuery.isFetchingNextPage,
    hasNextPage: resourcesQuery.hasNextPage,
    fetchNextPage: resourcesQuery.fetchNextPage,
    error: resourcesQuery.error,
  };
}

const DOCUMENTS_LIMIT = 10;

export function useResourceDocuments(
  connectorId: string | undefined,
  resourceExternalId: string | undefined,
  options?: { enabled?: boolean; search?: string }
) {
  const trpc = useTRPC();
  const debouncedSearch = useDebounce(options?.search ?? "", 300);

  const documentsQuery = useInfiniteQuery({
    ...trpc.apps.connectors.getResourceDocuments.infiniteQueryOptions(
      {
        connectorId: connectorId ?? "",
        resourceExternalId: resourceExternalId ?? "",
        search: debouncedSearch || undefined,
        limit: DOCUMENTS_LIMIT,
      },
      { getNextPageParam: (lastPage) => lastPage.nextCursor }
    ),
    enabled:
      (options?.enabled ?? false) && !!connectorId && !!resourceExternalId,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const documents = useMemo(
    () => documentsQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [documentsQuery.data?.pages]
  );

  const totalCount = documentsQuery.data?.pages[0]?.totalCount ?? 0;

  return {
    documents,
    totalCount,
    isLoading: documentsQuery.isLoading,
    isFetching: documentsQuery.isFetching,
    isFetchingNextPage: documentsQuery.isFetchingNextPage,
    hasNextPage: documentsQuery.hasNextPage,
    fetchNextPage: documentsQuery.fetchNextPage,
    error: documentsQuery.error,
  };
}

export function useToggleResourceSync(connectorId: string | undefined) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.apps.connectors.toggleResourceSync.mutationOptions(),
    onSuccess: () => {
      if (connectorId) {
        queryClient.invalidateQueries({
          queryKey: trpc.apps.connectors.getResources.queryOptions({
            connectorId,
          }).queryKey,
          predicate: (query) =>
            Array.isArray(query.queryKey) &&
            query.queryKey.includes(connectorId),
        });
      }
    },
  });
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
