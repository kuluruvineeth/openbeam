import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTRPC } from "../../../lib/trpc";
import { DOCUMENTS_LIMIT, RESOURCES_LIMIT } from "../constants";
import type { ConnectorDetail, ConnectorResource } from "../types";

function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

export function useConnector(connectorId: string | undefined) {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.apps.get.queryOptions({ appId: connectorId ?? "" }),
    enabled: !!connectorId,
    select: (data) => data as unknown as ConnectorDetail,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

export function useConnectorResources(connectorId: string | undefined) {
  const trpc = useTRPC();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

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
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });

  const resources = useMemo<ConnectorResource[]>(
    () =>
      (resourcesQuery.data?.pages.flatMap(
        (p) => p.items
      ) as ConnectorResource[]) ?? [],
    [resourcesQuery.data?.pages]
  );

  const totalCount = resourcesQuery.data?.pages[0]?.totalCount ?? 0;
  const enabledCount = useMemo(
    () => resources.filter((r) => r.syncEnabled).length,
    [resources]
  );

  const clearSearch = useCallback(() => setSearch(""), []);

  return {
    resources,
    totalCount,
    enabledCount,
    search,
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
    staleTime: 60_000,
    gcTime: 5 * 60_000,
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
  const trpc = useTRPC();

  return useInfiniteQuery({
    ...trpc.apps.getSyncHistory.infiniteQueryOptions(
      {
        connectorId: connectorId ?? "",
        limit: options?.limit ?? 10,
      },
      { getNextPageParam: (lastPage) => lastPage.nextCursor }
    ),
    enabled: !!connectorId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}

export function useConnectorSyncStatus(connectorId: string | undefined) {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.apps.getSyncStatus.queryOptions({
      connectorId: connectorId ?? "",
    }),
    enabled: !!connectorId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}
