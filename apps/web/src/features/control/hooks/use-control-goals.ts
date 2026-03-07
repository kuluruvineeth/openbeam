"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

export function useControlGoals() {
  const trpc = useTRPC();
  return useQuery({
    ...trpc.control.goals.list.queryOptions({}),
    placeholderData: keepPreviousData,
  });
}

export function useControlGoal(goalId: string) {
  const trpc = useTRPC();
  return useQuery({
    ...trpc.control.goals.get.queryOptions({ goalId }),
    enabled: !!goalId,
  });
}

export function useCreateGoal() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.control.goals.create.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.control.goals.list.queryKey(),
      });
    },
  });
}

export function useUpdateGoal() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.control.goals.update.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.control.goals.list.queryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.control.goals.get.queryKey(),
      });
    },
  });
}
