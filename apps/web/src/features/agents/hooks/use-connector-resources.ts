"use client";

import type { ResourceInfo } from "@openbeam/ui/components/event-builder";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useTRPC } from "@/trpc/client";

export function useConnectorResources() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const fetchResources = useCallback(
    async (
      connectorId: string,
      resourceType: string
    ): Promise<ResourceInfo[]> => {
      const resources = await queryClient.fetchQuery(
        trpc.connectorResources.listByType.queryOptions({
          connectorId,
          resourceType,
        })
      );
      return resources.map((r) => ({
        id: r.id,
        name: r.name ?? r.externalId ?? r.id,
        resourceType: r.resourceType,
      }));
    },
    [queryClient, trpc]
  );

  return { fetchResources };
}
