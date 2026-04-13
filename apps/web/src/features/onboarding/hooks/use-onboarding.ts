"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

export function useOnboarding() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const stateQuery = useQuery(trpc.onboarding.getState.queryOptions());

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: trpc.onboarding.getState.queryKey(),
    });

  const initializeMutation = useMutation({
    ...trpc.onboarding.initialize.mutationOptions(),
    onSuccess: invalidate,
  });

  const advanceMutation = useMutation({
    ...trpc.onboarding.advance.mutationOptions(),
    onSuccess: invalidate,
  });

  const skipMutation = useMutation({
    ...trpc.onboarding.skip.mutationOptions(),
    onSuccess: invalidate,
  });

  const completeMutation = useMutation({
    ...trpc.onboarding.complete.mutationOptions(),
    onSuccess: invalidate,
  });

  return {
    state: stateQuery.data?.state,
    needsOnboarding: stateQuery.data?.needsOnboarding ?? false,
    isLoading: stateQuery.isLoading,
    initialize: initializeMutation.mutateAsync,
    advance: advanceMutation.mutateAsync,
    skip: skipMutation.mutateAsync,
    complete: completeMutation.mutateAsync,
    isAdvancing: advanceMutation.isPending,
  };
}
