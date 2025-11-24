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
  const createMutation = useMutation(trpc.team.create.mutationOptions());

  return useMutation<
    { id: string; name: string; slug: string },
    Error,
    CreateTeamInput
  >({
    mutationKey: ["team", "create"],
    mutationFn: async ({ name }) => {
      const { slug } = await slugMutation.mutateAsync({
        name,
      });

      const team = await createMutation.mutateAsync({
        name,
        slug,
      });

      return team;
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
