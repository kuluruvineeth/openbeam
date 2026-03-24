import type {
  GoogleSitesSyncBatch,
  GoogleSitesSyncCursor,
  GoogleSitesTransformContext,
} from "@openbeam/types/services/connectors/google-sites";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { exportPageContent, listPagesForSite } from "../api/pages";
import { listAllSites } from "../api/sites";
import type { GoogleSitesClient } from "../client";
import { transformGoogleSitePage } from "../transformers/page";
import { transformGoogleSite } from "../transformers/site";
import { googleSitesFullSync } from "./full";

type SyncOptions = {
  cursor?: GoogleSitesSyncCursor;
  batchSize?: number;
};

export async function* googleSitesIncrementalSync(
  client: GoogleSitesClient,
  context: GoogleSitesTransformContext,
  options: SyncOptions = {}
): AsyncGenerator<GoogleSitesSyncBatch<GenericDocument>, void, undefined> {
  const { cursor, batchSize = 50 } = options;

  if (!(cursor?.lastSyncTime && cursor?.lastFullSync)) {
    yield* googleSitesFullSync(client, context, { batchSize });
    return;
  }

  const sinceDate = new Date(cursor.lastSyncTime).toISOString();

  let documents: GenericDocument[] = [];
  let processed = 0;
  const skipped = 0;
  let errors = 0;
  let latestModified = cursor.lastSyncTime;

  try {
    for await (const sites of listAllSites(client, {
      modifiedAfter: sinceDate,
    })) {
      for (const site of sites) {
        try {
          documents.push(transformGoogleSite(site, context));
          processed += 1;
          const ts = new Date(site.modifiedTime).getTime();
          if (ts > latestModified) {
            latestModified = ts;
          }
        } catch (error) {
          logger.error(
            { error, siteId: site.id },
            "Error transforming Google Site in incremental sync"
          );
          errors += 1;
        }

        if (documents.length >= batchSize) {
          yield {
            items: documents,
            cursor: {
              lastSyncTime: latestModified,
              lastFullSync: cursor.lastFullSync,
            },
            hasMore: true,
            stats: { processed, skipped, errors },
          };
          documents = [];
        }

        for await (const pages of listPagesForSite(client, site.id, {
          modifiedAfter: sinceDate,
        })) {
          for (const page of pages) {
            try {
              const htmlContent = await exportPageContent(client, page.id);
              const enrichedPage = { ...page, htmlContent };
              documents.push(
                transformGoogleSitePage(
                  enrichedPage,
                  context,
                  site.id,
                  site.name
                )
              );
              processed += 1;
              const ts = new Date(page.modifiedTime).getTime();
              if (ts > latestModified) {
                latestModified = ts;
              }
            } catch (error) {
              logger.error(
                { error, pageId: page.id, siteId: site.id },
                "Error transforming Google Sites page in incremental sync"
              );
              errors += 1;
            }

            if (documents.length >= batchSize) {
              yield {
                items: documents,
                cursor: {
                  lastSyncTime: latestModified,
                  lastFullSync: cursor.lastFullSync,
                },
                hasMore: true,
                stats: { processed, skipped, errors },
              };
              documents = [];
            }
          }
        }
      }
    }

    yield {
      items: documents,
      cursor: {
        lastSyncTime: latestModified,
        lastFullSync: cursor.lastFullSync,
      },
      hasMore: false,
      stats: { processed, skipped, errors },
    };
  } catch (error) {
    logger.warn(
      { error },
      "Google Sites incremental sync failed, falling back to full"
    );
    yield* googleSitesFullSync(client, context, { batchSize });
  }
}
