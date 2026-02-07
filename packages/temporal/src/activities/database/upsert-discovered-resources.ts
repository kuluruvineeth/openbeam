import {
  type UpsertConnectorResourceInput,
  upsertManyConnectorResources,
} from "@openplane/db";
import type { DatabaseActivityDependencies } from "./index";
import type { UpsertDiscoveredResourcesInput } from "./types";

export function createUpsertDiscoveredResourcesActivity(
  deps: DatabaseActivityDependencies
) {
  return async function upsertDiscoveredResources(
    input: UpsertDiscoveredResourcesInput
  ): Promise<{ upserted: number }> {
    if (input.resources.length === 0) {
      return { upserted: 0 };
    }

    const dbResources: UpsertConnectorResourceInput[] = input.resources.map(
      (r) => ({
        connectorId: r.connectorId,
        externalId: r.externalId,
        resourceType: r.resourceType,
        name: r.name,
        path: r.path,
        parentId: r.parentId,
        syncEnabled: r.syncEnabled,
        syncPriority: r.syncPriority,
        isPublic: r.isPublic,
        accessControl: r.accessControl,
        metadata: r.metadata as Record<
          string,
          string | number | boolean | null
        >,
      })
    );

    await upsertManyConnectorResources(deps.db, dbResources);

    return { upserted: input.resources.length };
  };
}
