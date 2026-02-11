"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { getVanillaTRPCClient, useTRPC } from "@/trpc/client";

type MissionStatus =
  | "DRAFT"
  | "ACTIVE"
  | "PAUSED"
  | "COMPLETED"
  | "CANCELLED"
  | "ARCHIVED";

type MissionActionsReturn = {
  start: () => void;
  pause: () => void;
  resume: () => void;
  cancel: () => void;
  archive: () => void;
  isLoading: boolean;
};

type MissionInput = { missionId: string };

export function useMissionActions(missionId: string): MissionActionsReturn {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const queryKey = trpc.missionControl.get.queryOptions({ missionId }).queryKey;
  const boardKey = trpc.missionControl.getBoard.queryOptions({}).queryKey;

  type MissionData = NonNullable<
    ReturnType<typeof queryClient.getQueryData<unknown, typeof queryKey>>
  >;

  const optimisticHandlers = (targetStatus: MissionStatus) => ({
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(
        queryKey,
        previous ? { ...previous, status: targetStatus } : previous
      );
      return { previous };
    },
    onError: (
      _error: unknown,
      _variables: MissionInput,
      context: { previous: MissionData | undefined } | undefined
    ) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: boardKey });
    },
  });

  const client = getVanillaTRPCClient();

  const startMutation = useMutation({
    mutationFn: (input: MissionInput) =>
      client.missionControl.start.mutate(input),
    ...optimisticHandlers("ACTIVE"),
  });

  const pauseMutation = useMutation({
    mutationFn: (input: MissionInput) =>
      client.missionControl.pause.mutate(input),
    ...optimisticHandlers("PAUSED"),
  });

  const resumeMutation = useMutation({
    mutationFn: (input: MissionInput) =>
      client.missionControl.resume.mutate(input),
    ...optimisticHandlers("ACTIVE"),
  });

  const cancelMutation = useMutation({
    mutationFn: (input: MissionInput) =>
      client.missionControl.cancel.mutate(input),
    ...optimisticHandlers("CANCELLED"),
  });

  const archiveMutation = useMutation({
    mutationFn: async (input: MissionInput) => {
      const mc = client.missionControl as unknown as Record<
        string,
        { mutate: (i: MissionInput) => Promise<{ success: boolean }> }
      >;
      return await mc.archive.mutate(input);
    },
    ...optimisticHandlers("ARCHIVED"),
  });

  const start = useCallback(
    () => startMutation.mutate({ missionId }),
    [startMutation, missionId]
  );

  const pause = useCallback(
    () => pauseMutation.mutate({ missionId }),
    [pauseMutation, missionId]
  );

  const resume = useCallback(
    () => resumeMutation.mutate({ missionId }),
    [resumeMutation, missionId]
  );

  const cancel = useCallback(
    () => cancelMutation.mutate({ missionId }),
    [cancelMutation, missionId]
  );

  const archive = useCallback(
    () => archiveMutation.mutate({ missionId }),
    [archiveMutation, missionId]
  );

  const isLoading =
    startMutation.isPending ||
    pauseMutation.isPending ||
    resumeMutation.isPending ||
    cancelMutation.isPending ||
    archiveMutation.isPending;

  return { start, pause, resume, cancel, archive, isLoading };
}

export type { MissionActionsReturn };
