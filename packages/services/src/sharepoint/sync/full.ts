import type {
  SharePointSyncBatch,
  SharePointTransformContext,
} from "@openbeam/types/services/connectors/sharepoint";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import type { MicrosoftGraphClient } from "../../microsoft/client";
import { transformDriveItem } from "../transformers/drive-item";

type SharePointSite = {
  id: string;
  displayName: string;
  webUrl: string;
};

type SharePointDrive = {
  id: string;
  name: string;
  driveType: string;
};

type SharePointDriveItem = {
  id: string;
  name: string;
  webUrl: string;
  size?: number;
  file?: { mimeType: string };
  folder?: { childCount: number };
  createdDateTime: string;
  lastModifiedDateTime: string;
  createdBy?: { user?: { displayName?: string; email?: string } };
  lastModifiedBy?: { user?: { displayName?: string; email?: string } };
  parentReference?: {
    id?: string;
    path?: string;
    driveId?: string;
    siteId?: string;
  };
  "@removed"?: { reason: string };
};

export type SharePointFileInfo = {
  itemId: string;
  driveId: string;
  name: string;
  mimeType: string;
  size: number;
};

async function discoverSites(
  client: MicrosoftGraphClient
): Promise<SharePointSite[]> {
  const siteMap = new Map<string, SharePointSite>();

  try {
    for await (const page of client.paginate<SharePointSite>(
      "/me/followedSites"
    )) {
      for (const site of page) {
        siteMap.set(site.id, site);
      }
    }
  } catch (error) {
    logger.warn({ error }, "Failed to fetch followed sites, trying search");
  }

  try {
    for await (const page of client.paginate<SharePointSite>("/sites", {
      search: "*",
    })) {
      for (const site of page) {
        if (!siteMap.has(site.id)) {
          siteMap.set(site.id, site);
        }
      }
    }
  } catch (error) {
    logger.warn({ error }, "Failed to search sites");
  }

  return Array.from(siteMap.values());
}

export async function* sharepointFullSync(
  client: MicrosoftGraphClient,
  context: SharePointTransformContext,
  options: {
    batchSize?: number;
    onFilesDiscovered?: (files: SharePointFileInfo[]) => Promise<void>;
  } = {}
): AsyncGenerator<SharePointSyncBatch<GenericDocument>, void, undefined> {
  const batchSize = options.batchSize ?? 100;
  let documents: GenericDocument[] = [];
  let processed = 0;
  let skipped = 0;
  let errors = 0;
  const deltaLinks: Record<string, string> = {};
  const siteIds: string[] = [];

  const sites = await discoverSites(client);

  logger.info(
    { siteCount: sites.length, connectorId: client.connectorId },
    "SharePoint full sync: discovered sites"
  );

  for (const site of sites) {
    siteIds.push(site.id);

    const drives: SharePointDrive[] = [];
    try {
      for await (const page of client.paginate<SharePointDrive>(
        `/sites/${site.id}/drives`
      )) {
        drives.push(...page);
      }
    } catch (error) {
      logger.error(
        { error, siteId: site.id },
        "Error fetching drives for site"
      );
      errors += 1;
      continue;
    }

    for (const drive of drives) {
      try {
        for await (const page of client.deltaPages<SharePointDriveItem>(
          `/drives/${drive.id}/root/delta`
        )) {
          if (page.deltaLink) {
            deltaLinks[`${site.id}:${drive.id}`] = page.deltaLink;
          }

          const pendingFiles: SharePointFileInfo[] = [];

          for (const item of page.items) {
            if (item["@removed"]) {
              skipped += 1;
              continue;
            }
            if (item.folder) {
              skipped += 1;
              continue;
            }
            try {
              const doc = transformDriveItem(item, context, {
                siteName: site.displayName,
                driveName: drive.name,
              });
              documents.push(doc);
              processed += 1;

              if (item.file && options.onFilesDiscovered) {
                pendingFiles.push({
                  itemId: item.id,
                  driveId: drive.id,
                  name: item.name,
                  mimeType: item.file.mimeType,
                  size: item.size ?? 0,
                });
              }

              if (documents.length >= batchSize) {
                if (pendingFiles.length > 0 && options.onFilesDiscovered) {
                  await options.onFilesDiscovered(pendingFiles);
                  pendingFiles.length = 0;
                }
                yield {
                  items: documents,
                  cursor: {
                    deltaLinks: { ...deltaLinks },
                    siteIds: [...siteIds],
                    lastFullSync: Date.now(),
                  },
                  hasMore: true,
                  stats: { processed, skipped, errors },
                };
                documents = [];
              }
            } catch (error) {
              logger.error(
                { error, itemId: item.id },
                "Error transforming drive item"
              );
              errors += 1;
            }
          }

          if (pendingFiles.length > 0 && options.onFilesDiscovered) {
            await options.onFilesDiscovered(pendingFiles);
          }
        }
      } catch (error) {
        logger.error(
          { error, driveId: drive.id, siteId: site.id },
          "Error fetching delta for drive"
        );
        errors += 1;
      }
    }
  }

  yield {
    items: documents,
    cursor: { deltaLinks, siteIds, lastFullSync: Date.now() },
    hasMore: false,
    stats: { processed, skipped, errors },
  };
}
