import type {
  CanvaSyncBatch,
  CanvaSyncCursor,
  CanvaTransformContext,
} from "@openbeam/types/services/connectors/canva";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { listAllBrandTemplates } from "../api/brand-templates";
import { listDesignComments } from "../api/comments";
import { listAllDesigns } from "../api/designs";
import { listAllFolders } from "../api/folders";
import type { CanvaClient } from "../client";
import { transformCanvaBrandTemplate } from "../transformers/brand-template";
import { transformCanvaComment } from "../transformers/comment";
import { transformCanvaDesign } from "../transformers/design";
import { transformCanvaFolder } from "../transformers/folder";

export async function* canvaFullSync(
  client: CanvaClient,
  context: CanvaTransformContext,
  options: {
    batchSize?: number;
    syncBrandTemplates?: boolean;
    syncFolders?: boolean;
    syncComments?: boolean;
  } = {}
): AsyncGenerator<CanvaSyncBatch<GenericDocument>, void, undefined> {
  const batchSize = options.batchSize ?? 100;
  const syncBrandTemplates = options.syncBrandTemplates ?? true;
  const syncFolders = options.syncFolders ?? true;
  const syncComments = options.syncComments ?? false;

  let documents: GenericDocument[] = [];
  let processed = 0;
  const skipped = 0;
  let errors = 0;
  let latestModified = 0;
  const designIds: string[] = [];

  for await (const designs of listAllDesigns(client)) {
    for (const design of designs) {
      try {
        documents.push(transformCanvaDesign(design, context));
        processed += 1;
        latestModified = trackModified(design.updated_at, latestModified);
        if (syncComments) {
          designIds.push(design.id);
        }
      } catch (error) {
        logger.error(
          { error, designId: design.id },
          "Error transforming Canva design"
        );
        errors += 1;
      }
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

  if (syncFolders) {
    for await (const folders of listAllFolders(client)) {
      for (const folder of folders) {
        try {
          documents.push(transformCanvaFolder(folder, context));
          processed += 1;
          latestModified = trackModified(folder.updated_at, latestModified);
        } catch (error) {
          logger.error(
            { error, folderId: folder.id },
            "Error transforming Canva folder"
          );
          errors += 1;
        }
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

  if (syncBrandTemplates) {
    for await (const templates of listAllBrandTemplates(client)) {
      for (const template of templates) {
        try {
          documents.push(transformCanvaBrandTemplate(template, context));
          processed += 1;
          latestModified = trackModified(template.updated_at, latestModified);
        } catch (error) {
          logger.error(
            { error, templateId: template.id },
            "Error transforming Canva brand template"
          );
          errors += 1;
        }
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

  if (syncComments) {
    for (const designId of designIds) {
      try {
        for await (const comments of listDesignComments(client, designId)) {
          for (const comment of comments) {
            try {
              documents.push(transformCanvaComment(comment, context));
              processed += 1;
              latestModified = trackModified(
                comment.updated_at,
                latestModified
              );
            } catch (error) {
              logger.error(
                { error, commentId: comment.id },
                "Error transforming Canva comment"
              );
              errors += 1;
            }
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
      } catch (error) {
        logger.warn({ error, designId }, "Failed to fetch comments for design");
      }
    }
  }

  const cursor: CanvaSyncCursor = {
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
): CanvaSyncBatch<GenericDocument> {
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

function trackModified(updateTime: string, current: number): number {
  const ts = new Date(updateTime).getTime();
  return ts > current ? ts : current;
}
