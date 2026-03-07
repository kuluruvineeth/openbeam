"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

export function useControlSecrets() {
  const trpc = useTRPC();
  return useQuery(trpc.control.secrets.list.queryOptions());
}

export function useCreateSecret() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.control.secrets.create.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.control.secrets.list.queryKey(),
      });
    },
  });
}

export function useRotateSecret() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.control.secrets.rotate.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.control.secrets.list.queryKey(),
      });
    },
  });
}

export function useControlMembers() {
  const trpc = useTRPC();
  return useQuery(trpc.control.access.listMembers.queryOptions());
}

export function useControlInvites() {
  const trpc = useTRPC();
  return useQuery(trpc.control.access.listInvites.queryOptions());
}

export function useCreateInvite() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.control.access.createInvite.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.control.access.listInvites.queryKey(),
      });
    },
  });
}

export function useRevokeInvite() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.control.access.revokeInvite.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.control.access.listInvites.queryKey(),
      });
    },
  });
}

export function useControlJoinRequests(status?: string) {
  const trpc = useTRPC();
  return useQuery(
    trpc.control.access.listJoinRequests.queryOptions(status ? { status } : {})
  );
}

export function useApproveJoinRequest() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.control.access.approveJoinRequest.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.control.access.listJoinRequests.queryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.control.access.listMembers.queryKey(),
      });
    },
  });
}

export function useRejectJoinRequest() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.control.access.rejectJoinRequest.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.control.access.listJoinRequests.queryKey(),
      });
    },
  });
}
