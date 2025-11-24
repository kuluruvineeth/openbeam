"use client";

import {
  type UseMutationOptions,
  useMutation,
  useQuery,
} from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

export type CreateTeamInput = {
  name: string;
};

export type ChangeTeamInput = {
  teamId: string;
};

export function useCreateTeam(
  options?: UseMutationOptions<
    { id: string; name: string; slug: string },
    Error,
    CreateTeamInput
  >
) {
  const trpc = useTRPC();
  const slugMutation = useMutation(trpc.team.generateSlug.mutationOptions());

  return useMutation<
    { id: string; name: string; slug: string },
    Error,
    CreateTeamInput
  >({
    mutationKey: ["team", "create"],
    mutationFn: async ({ name }) => {
      await slugMutation.mutateAsync({
        name,
      });

      // TODO: Implement team creation via tRPC or API
      // For now, this is a placeholder
      throw new Error("Team creation not yet implemented");
    },
    ...(options ?? {}),
  });
}

export function useTeams() {
  const trpc = useTRPC();

  return useQuery(trpc.team.list.queryOptions());
}

export function useChangeTeam() {
  const trpc = useTRPC();

  return useMutation(trpc.team.switch.mutationOptions());
}
