"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

export function useControlIssues(filters?: {
  status?: string;
  assigneeAgentId?: string;
  projectId?: string;
  parentId?: string;
  limit?: number;
  offset?: number;
}) {
  const trpc = useTRPC();

  const listQuery = useQuery({
    ...trpc.control.issues.list.queryOptions(filters ?? {}),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });

  const countQuery = useQuery({
    ...trpc.control.issues.count.queryOptions({
      status: filters?.status,
    }),
    staleTime: 15_000,
  });

  return {
    issues: listQuery.data ?? [],
    count: countQuery.data ?? 0,
    isLoading: listQuery.isLoading,
    isFetching: listQuery.isFetching,
    error: listQuery.error,
  };
}

export function useControlIssue(issueId: string) {
  const trpc = useTRPC();

  const issueQuery = useQuery({
    ...trpc.control.issues.get.queryOptions({ issueId }),
    enabled: !!issueId,
  });

  const commentsQuery = useQuery({
    ...trpc.control.issues.listComments.queryOptions({ issueId }),
    enabled: !!issueId,
  });

  return {
    issue: issueQuery.data,
    comments: commentsQuery.data ?? [],
    isLoading: issueQuery.isLoading,
    error: issueQuery.error,
  };
}

export function useCreateIssue() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.control.issues.create.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.control.issues.list
          .queryOptions({})
          .queryKey.slice(0, 3),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.control.issues.count
          .queryOptions({})
          .queryKey.slice(0, 3),
      });
    },
  });
}

export function useUpdateIssue() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.control.issues.update.mutationOptions(),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: trpc.control.issues.get.queryOptions({
          issueId: variables.issueId,
        }).queryKey,
      });
      queryClient.invalidateQueries({
        queryKey: trpc.control.issues.list
          .queryOptions({})
          .queryKey.slice(0, 3),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.control.issues.count
          .queryOptions({})
          .queryKey.slice(0, 3),
      });
    },
  });
}

export function useHideIssue() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.control.issues.hide.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.control.issues.list
          .queryOptions({})
          .queryKey.slice(0, 3),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.control.issues.count
          .queryOptions({})
          .queryKey.slice(0, 3),
      });
    },
  });
}

export function useAddIssueComment(issueId: string) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.control.issues.addComment.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.control.issues.listComments.queryOptions({ issueId })
          .queryKey,
      });
    },
  });
}

export function useIssueLabels() {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.control.issues.listLabels.queryOptions(),
    staleTime: 60_000,
  });
}

export function useAssignLabel() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.control.issues.assignLabel.mutationOptions(),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: trpc.control.issues.get.queryOptions({
          issueId: variables.issueId,
        }).queryKey,
      });
    },
  });
}

export function useRemoveLabel() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.control.issues.removeLabel.mutationOptions(),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: trpc.control.issues.get.queryOptions({
          issueId: variables.issueId,
        }).queryKey,
      });
    },
  });
}
