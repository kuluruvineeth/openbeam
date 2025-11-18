"use client";

import {
  type UseMutationOptions,
  useMutation,
  useQuery,
} from "@tanstack/react-query";
import { authClient } from "@/lib/auth/client";
import { useTRPC } from "@/trpc/client";

export type CreateOrganizationInput = {
  name: string;
};

export type CreateOrganizationResult = Awaited<
  ReturnType<(typeof authClient)["organization"]["create"]>
>;

export type ChangeOrganizationInput = {
  organizationId: string;
};

export function useCreateOrganization(
  options?: UseMutationOptions<
    CreateOrganizationResult,
    Error,
    CreateOrganizationInput
  >
) {
  const trpc = useTRPC();
  const slugMutation = useMutation(
    trpc.organization.generateSlug.mutationOptions()
  );

  return useMutation<CreateOrganizationResult, Error, CreateOrganizationInput>({
    mutationKey: ["organization", "create"],
    mutationFn: async ({ name }) => {
      const { slug } = await slugMutation.mutateAsync({
        name,
      });

      return authClient.organization.create({
        name,
        slug,
      });
    },
    ...(options ?? {}),
  });
}

export function useOrganizations() {
  const trpc = useTRPC();

  return useQuery(trpc.organization.list.queryOptions());
}

export function useChangeOrganization() {
  const trpc = useTRPC();

  return useMutation(trpc.organization.update.mutationOptions());
}
