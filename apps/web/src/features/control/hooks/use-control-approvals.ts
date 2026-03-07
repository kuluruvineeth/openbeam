"use client";

import type { ApprovalStatus } from "@openbeam/types/control";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

export function useControlApprovals(filters?: {
  status?: ApprovalStatus;
  type?: string;
  limit?: number;
}) {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.control.approvals.list.queryOptions(filters ?? {}),
    placeholderData: keepPreviousData,
  });
}

export function useControlApproval(approvalId: string) {
  const trpc = useTRPC();

  return useQuery(trpc.control.approvals.get.queryOptions({ approvalId }));
}

function useApprovalAction(method: "approve" | "reject" | "requestRevision") {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.control.approvals[method].mutationOptions(),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: trpc.control.approvals.get.queryKey({
          approvalId: variables.approvalId,
        }),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.control.approvals.list.queryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.control.dashboard.summary.queryKey(),
      });
    },
  });
}

export function useApproveApproval() {
  return useApprovalAction("approve");
}

export function useRejectApproval() {
  return useApprovalAction("reject");
}

export function useRequestRevision() {
  return useApprovalAction("requestRevision");
}

export function useAddApprovalComment(approvalId: string) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.control.approvals.addComment.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.control.approvals.get.queryKey({ approvalId }),
      });
    },
  });
}
