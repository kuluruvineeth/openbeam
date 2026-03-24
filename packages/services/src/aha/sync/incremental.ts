import type {
  AhaSyncBatch,
  AhaSyncCursor,
  AhaSyncOptions,
  AhaTransformContext,
} from "@openbeam/types/services/connectors/aha";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { listEpics } from "../api/epics";
import { listFeatures } from "../api/features";
import { listIdeas } from "../api/ideas";
import { listInitiatives } from "../api/initiatives";
import { listProducts } from "../api/products";
import { listReleases } from "../api/releases";
import type { AhaClient } from "../client";
import { transformEpic } from "../transformers/epic";
import { transformFeature } from "../transformers/feature";
import { transformIdea } from "../transformers/idea";
import { transformInitiative } from "../transformers/initiative";
import { transformRelease } from "../transformers/release";
import { ahaFullSync } from "./full";
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;

export async function* ahaIncrementalSync(
  client: AhaClient,
  context: AhaTransformContext,
  options: AhaSyncOptions = {}
): AsyncGenerator<AhaSyncBatch<GenericDocument>, void, undefined> {
  const {
    cursor,
    batchSize = DEFAULT_BATCH_SIZE,
    syncEpics = true,
    syncInitiatives = true,
    productFilter = [],
    onStageChange,
  } = options;

  if (!(cursor?.lastSyncTime && cursor?.lastFullSync)) {
    yield* ahaFullSync(client, context, options);
    return;
  }

  logger.info(
    { connectorId: client.connectorId, lastSyncTime: cursor.lastSyncTime },
    "Aha! incremental sync started"
  );

  const updatedSince = new Date(cursor.lastSyncTime).toISOString();
  let documents: GenericDocument[] = [];
  let processed = 0;
  let errors = 0;

  try {
    let products = await listProducts(client);

    if (productFilter.length > 0) {
      products = products.filter(
        (p) =>
          productFilter.includes(p.id) ||
          productFilter.includes(p.reference_num)
      );
    }

    for (const product of products) {
      await onStageChange?.("Syncing updated ideas", processed, product.name);

      for await (const ideas of listIdeas(client, product.id, {
        updatedSince,
      })) {
        for (const idea of ideas) {
          try {
            documents.push(await transformIdea(idea, context));
            processed += 1;
          } catch (error) {
            logger.error(
              { error, ideaId: idea.id },
              "Error transforming idea in incremental sync"
            );
            errors += 1;
          }
        }

        if (documents.length >= batchSize) {
          yield createSyncBatch(
            documents,
            {
              lastSyncTime: cursor.lastSyncTime,
              lastFullSync: cursor.lastFullSync,
            },
            true,
            { processed, skipped: 0, errors }
          );
          documents = [];
        }
      }

      await onStageChange?.(
        "Syncing updated features",
        processed,
        product.name
      );

      for await (const features of listFeatures(client, product.id, {
        updatedSince,
      })) {
        for (const feature of features) {
          try {
            documents.push(await transformFeature(feature, context));
            processed += 1;
          } catch (error) {
            logger.error(
              { error, featureId: feature.id },
              "Error transforming feature in incremental sync"
            );
            errors += 1;
          }
        }

        if (documents.length >= batchSize) {
          yield createSyncBatch(
            documents,
            {
              lastSyncTime: cursor.lastSyncTime,
              lastFullSync: cursor.lastFullSync,
            },
            true,
            { processed, skipped: 0, errors }
          );
          documents = [];
        }
      }

      await onStageChange?.(
        "Syncing updated releases",
        processed,
        product.name
      );

      for await (const releases of listReleases(client, product.id, {
        updatedSince,
      })) {
        for (const release of releases) {
          try {
            documents.push(await transformRelease(release, context));
            processed += 1;
          } catch (error) {
            logger.error(
              { error, releaseId: release.id },
              "Error transforming release in incremental sync"
            );
            errors += 1;
          }
        }

        if (documents.length >= batchSize) {
          yield createSyncBatch(
            documents,
            {
              lastSyncTime: cursor.lastSyncTime,
              lastFullSync: cursor.lastFullSync,
            },
            true,
            { processed, skipped: 0, errors }
          );
          documents = [];
        }
      }

      if (syncInitiatives) {
        for await (const initiatives of listInitiatives(client, product.id, {
          updatedSince,
        })) {
          for (const initiative of initiatives) {
            try {
              documents.push(await transformInitiative(initiative, context));
              processed += 1;
            } catch (error) {
              logger.error(
                { error, initiativeId: initiative.id },
                "Error transforming initiative in incremental sync"
              );
              errors += 1;
            }
          }
        }
      }

      if (syncEpics) {
        for await (const epics of listEpics(client, product.id, {
          updatedSince,
        })) {
          for (const epic of epics) {
            try {
              documents.push(await transformEpic(epic, context));
              processed += 1;
            } catch (error) {
              logger.error(
                { error, epicId: epic.id },
                "Error transforming epic in incremental sync"
              );
              errors += 1;
            }
          }
        }
      }
    }

    const newCursor: AhaSyncCursor = {
      lastSyncTime: Date.now(),
      lastFullSync: cursor.lastFullSync,
    };

    yield createSyncBatch(documents, newCursor, false, {
      processed,
      skipped: 0,
      errors,
    });
  } catch (error) {
    logger.warn(
      { error },
      "Aha! incremental sync failed, falling back to full"
    );
    yield* ahaFullSync(client, context, options);
  }
}
