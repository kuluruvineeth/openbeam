"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

export function useVoiceSettings() {
  const trpc = useTRPC();

  return useQuery(trpc.voice.getSettings.queryOptions());
}

export function useUpdateVoiceSettings() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.voice.updateSettings.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.voice.getSettings.queryKey(),
      });
    },
  });
}

export function useVoiceStats() {
  const trpc = useTRPC();

  return useQuery(trpc.voice.getStats.queryOptions({}));
}
