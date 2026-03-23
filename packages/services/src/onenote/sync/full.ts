import type {
  OneNoteSyncBatch,
  OneNoteSyncCursor,
  OneNoteTransformContext,
} from "@openbeam/types/services/connectors/onenote";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import type { MicrosoftGraphClient } from "../../microsoft/client";
import { listNotebooks, type OneNoteNotebook } from "../api/notebooks";
import { getPageContent, listPagesInSection } from "../api/pages";
import { listSectionsInNotebook, type OneNoteSection } from "../api/sections";
import { transformOneNoteNotebook } from "../transformers/notebook";
import { transformOneNotePage } from "../transformers/page";
import { transformOneNoteSection } from "../transformers/section";

type FullSyncOptions = {
  batchSize?: number;
  syncPageContent?: boolean;
  includeNotebooks?: string[];
  excludeNotebooks?: string[];
  lookbackDays?: number;
};

export async function* onenoteFullSync(
  client: MicrosoftGraphClient,
  context: OneNoteTransformContext,
  options: FullSyncOptions = {}
): AsyncGenerator<OneNoteSyncBatch<GenericDocument>, void, undefined> {
  const batchSize = options.batchSize ?? 50;
  const syncPageContent = options.syncPageContent ?? true;
  const includeNotebooks = options.includeNotebooks ?? [];
  const excludeNotebooks = options.excludeNotebooks ?? [];

  let documents: GenericDocument[] = [];
  let processed = 0;
  let skipped = 0;
  let errors = 0;
  let latestModified = 0;

  const allNotebooks: OneNoteNotebook[] = [];
  for await (const page of listNotebooks(client)) {
    allNotebooks.push(...page);
  }

  const filteredNotebooks = allNotebooks.filter((nb) => {
    if (
      includeNotebooks.length > 0 &&
      !includeNotebooks.includes(nb.displayName)
    ) {
      return false;
    }
    if (excludeNotebooks.includes(nb.displayName)) {
      return false;
    }
    return true;
  });

  for (const notebook of filteredNotebooks) {
    try {
      documents.push(transformOneNoteNotebook(notebook, context));
      processed += 1;
      latestModified = trackModified(
        notebook.lastModifiedDateTime,
        latestModified
      );
    } catch (error) {
      logger.error(
        { error, notebookId: notebook.id },
        "Error transforming OneNote notebook"
      );
      errors += 1;
    }

    if (documents.length >= batchSize) {
      yield makeBatch(
        documents,
        { processed, skipped, errors },
        latestModified
      );
      documents = [];
    }

    const allSections: OneNoteSection[] = [];
    for await (const sectionPage of listSectionsInNotebook(
      client,
      notebook.id
    )) {
      allSections.push(...sectionPage);
    }

    for (const section of allSections) {
      try {
        documents.push(transformOneNoteSection(section, context));
        processed += 1;
        latestModified = trackModified(
          section.lastModifiedDateTime,
          latestModified
        );
      } catch (error) {
        logger.error(
          { error, sectionId: section.id },
          "Error transforming OneNote section"
        );
        errors += 1;
      }

      if (documents.length >= batchSize) {
        yield makeBatch(
          documents,
          { processed, skipped, errors },
          latestModified
        );
        documents = [];
      }

      for await (const pageBatch of listPagesInSection(client, section.id)) {
        for (const page of pageBatch) {
          try {
            let htmlContent: string | undefined;
            if (syncPageContent) {
              try {
                htmlContent = await getPageContent(client, page.id);
              } catch (contentError) {
                logger.warn(
                  { error: contentError, pageId: page.id },
                  "Failed to fetch page content, indexing metadata only"
                );
              }
            }

            documents.push(transformOneNotePage(page, context, htmlContent));
            processed += 1;
            latestModified = trackModified(
              page.lastModifiedDateTime,
              latestModified
            );
          } catch (error) {
            logger.error(
              { error, pageId: page.id },
              "Error transforming OneNote page"
            );
            errors += 1;
          }

          if (documents.length >= batchSize) {
            yield makeBatch(
              documents,
              { processed, skipped, errors },
              latestModified
            );
            documents = [];
          }
        }
      }
    }
  }

  skipped = allNotebooks.length - filteredNotebooks.length;

  const cursor: OneNoteSyncCursor = {
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
  latestModified: number
): OneNoteSyncBatch<GenericDocument> {
  return {
    items,
    cursor: {
      lastSyncTime: latestModified || Date.now(),
      lastFullSync: Date.now(),
    },
    hasMore: true,
    stats,
  };
}

function trackModified(dateTime: string, current: number): number {
  const ts = new Date(dateTime).getTime();
  return ts > current ? ts : current;
}
