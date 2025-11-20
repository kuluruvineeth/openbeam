"use client";

import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

// Types
type AppId = string;

export function useAppsQuery() {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.apps.list.queryOptions());
}

export function useAppQuery(appId: AppId) {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.apps.get.queryOptions({ appId }));
}

export function useConnectApp(options?: {
  onSuccess?: () => void;
  onError?: () => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.apps.connect.mutationOptions(),
    ...options,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.apps.list.queryOptions().queryKey,
      });
      options?.onSuccess?.();
    },
    onError: () => {
      options?.onError?.();
    },
  });
}

export function useDisconnectApp(options?: {
  onSuccess?: () => void;
  onError?: () => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.apps.disconnect.mutationOptions(),
    ...options,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.apps.list.queryOptions().queryKey,
      });
      options?.onSuccess?.();
    },
    onError: () => {
      options?.onError?.();
    },
  });
}

export function useUpdateAppSettings(options?: {
  onSuccess?: () => void;
  onError?: () => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.apps.updateSettings.mutationOptions(),
    ...options,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.apps.list.queryOptions().queryKey,
      });
      options?.onSuccess?.();
    },
    onError: () => {
      options?.onError?.();
    },
  });
}
