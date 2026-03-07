"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

export function useControlProjects() {
  const trpc = useTRPC();
  return useQuery({
    ...trpc.control.projects.list.queryOptions({}),
    placeholderData: keepPreviousData,
  });
}

export function useControlProject(projectId: string) {
  const trpc = useTRPC();
  return useQuery({
    ...trpc.control.projects.get.queryOptions({ projectId }),
    enabled: !!projectId,
  });
}

export function useCreateProject() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.control.projects.create.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.control.projects.list.queryKey(),
      });
    },
  });
}

export function useUpdateProject() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.control.projects.update.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.control.projects.list.queryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.control.projects.get.queryKey(),
      });
    },
  });
}

export function useArchiveProject() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.control.projects.archive.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.control.projects.list.queryKey(),
      });
    },
  });
}

export function useAddWorkspace(projectId: string) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.control.projects.addWorkspace.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.control.projects.get.queryOptions({ projectId })
          .queryKey,
      });
    },
  });
}

export function useLinkGoal() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.control.projects.linkGoal.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.control.projects.list.queryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.control.projects.get.queryKey(),
      });
    },
  });
}

export function useUnlinkGoal() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.control.projects.unlinkGoal.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.control.projects.list.queryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.control.projects.get.queryKey(),
      });
    },
  });
}
