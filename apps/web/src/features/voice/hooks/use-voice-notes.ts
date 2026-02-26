"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

const PAGE_SIZE = 20;

export function useVoiceNotes(search?: string) {
  const trpc = useTRPC();

  return useInfiniteQuery({
    ...trpc.voice.listNotes.infiniteQueryOptions(
      { limit: PAGE_SIZE, search },
      { getNextPageParam: (lastPage) => lastPage.nextCursor }
    ),
  });
}

export function useCreateVoiceNote() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.voice.createNote.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.voice.listNotes.queryKey(),
      });
    },
  });
}

export function useDeleteVoiceNote() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.voice.deleteNote.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.voice.listNotes.queryKey(),
      });
    },
  });
}
