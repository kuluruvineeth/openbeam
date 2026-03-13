import type { Database } from "@openbeam/db";
import type { FileResourceRecord, GetFileResourcesInput } from "./types";

const DEFAULT_RESOURCE_TYPES = ["file", "video", "audio", "attachment"];

export function createGetFileResourcesActivity(deps: { db: Database }) {
  return async function getFileResources(
    input: GetFileResourcesInput
  ): Promise<FileResourceRecord[]> {
    const resourceTypes = input.resourceTypes ?? DEFAULT_RESOURCE_TYPES;

    const resources = await deps.db.connectorResource.findMany({
      where: {
        connectorId: input.connectorId,
        resourceType: { in: resourceTypes },
        syncEnabled: true,
      },
      select: {
        externalId: true,
        resourceType: true,
        name: true,
        metadata: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const results: FileResourceRecord[] = [];

    for (const r of resources) {
      const meta = (r.metadata as Record<string, unknown>) ?? {};
      const mimeType = (meta.mimeType as string) ?? "application/octet-stream";
      const downloadUrl = meta.downloadUrl as string | undefined;

      results.push({
        externalId: r.externalId,
        resourceType: r.resourceType,
        name: r.name ?? r.externalId,
        mimeType,
        downloadUrl: downloadUrl || undefined,
        size: meta.size as number | undefined,
        metadata: meta,
      });
    }

    return results;
  };
}
