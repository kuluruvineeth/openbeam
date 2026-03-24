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

export async function* googleSitesFullSync(
  client: GoogleSitesClient,
  context: GoogleSitesTransformContext,
  options: { batchSize?: number } = {}
): AsyncGenerator<GoogleSitesSyncBatch<GenericDocument>, void, undefined> {
  const batchSize = options.batchSize ?? 50;

  let documents: GenericDocument[] = [];
  let processed = 0;
  const skipped = 0;
  let errors = 0;
  let latestModified = 0;

  for await (const sites of listAllSites(client)) {
    for (const site of sites) {
      try {
        documents.push(transformGoogleSite(site, context));
        processed += 1;
        latestModified = trackModified(site.modifiedTime, latestModified);
      } catch (error) {
        logger.error(
          { error, siteId: site.id },
          "Error transforming Google Site"
        );
        errors += 1;
      }

      if (documents.length >= batchSize) {
        yield makeBatch(
          documents,
          { processed, skipped, errors },
          true,
          latestModified
        );
        documents = [];
      }

      for await (const pages of listPagesForSite(client, site.id)) {
        for (const page of pages) {
          try {
            const htmlContent = await exportPageContent(client, page.id);
            const enrichedPage = { ...page, htmlContent };
            documents.push(
              transformGoogleSitePage(enrichedPage, context, site.id, site.name)
            );
            processed += 1;
            latestModified = trackModified(page.modifiedTime, latestModified);
          } catch (error) {
            logger.error(
              { error, pageId: page.id, siteId: site.id },
              "Error transforming Google Sites page"
            );
            errors += 1;
          }

          if (documents.length >= batchSize) {
            yield makeBatch(
              documents,
              { processed, skipped, errors },
              true,
              latestModified
            );
            documents = [];
          }
        }
      }
    }
  }

  const cursor: GoogleSitesSyncCursor = {
    lastSyncTime: latestModified || Date.now(),
    lastFullSync: Date.now(),
  };

  yield {
    items: documents,
    cursor,
    hasMore: false,
    stats: { processed, skipped, errors },
  };
}

function makeBatch(
  items: GenericDocument[],
  stats: { processed: number; skipped: number; errors: number },
  hasMore: boolean,
  latestModified: number
): GoogleSitesSyncBatch<GenericDocument> {
  return {
    items,
    cursor: {
      lastSyncTime: latestModified || Date.now(),
      lastFullSync: Date.now(),
    },
    hasMore,
    stats,
  };
}

function trackModified(modifiedTime: string, current: number): number {
  const ts = new Date(modifiedTime).getTime();
  return ts > current ? ts : current;
}
