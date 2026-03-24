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
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;

interface SyncState {
  documents: GenericDocument[];
  processed: number;
  skipped: number;
  errors: number;
}

export async function* ahaFullSync(
  client: AhaClient,
  context: AhaTransformContext,
  options: AhaSyncOptions = {}
): AsyncGenerator<AhaSyncBatch<GenericDocument>, void, undefined> {
  const {
    batchSize = DEFAULT_BATCH_SIZE,
    syncEpics = true,
    syncInitiatives = true,
    productFilter = [],
    onStageChange,
  } = options;

  logger.info(
    {
      connectorId: client.connectorId,
      syncEpics,
      syncInitiatives,
      productFilter,
    },
    "Aha! full sync started"
  );

  const state: SyncState = {
    documents: [],
    processed: 0,
    skipped: 0,
    errors: 0,
  };

  const cursor: AhaSyncCursor = {
    lastSyncTime: Date.now(),
    lastFullSync: Date.now(),
  };

  await onStageChange?.("Fetching products", state.processed);
  let products = await listProducts(client);

  if (productFilter.length > 0) {
    products = products.filter(
      (p) =>
        productFilter.includes(p.id) || productFilter.includes(p.reference_num)
    );
  }

  for (const product of products) {
    await onStageChange?.("Syncing ideas", state.processed, product.name);

    for await (const ideas of listIdeas(client, product.id)) {
      for (const idea of ideas) {
        try {
          state.documents.push(await transformIdea(idea, context));
          state.processed += 1;
        } catch (error) {
          logger.error(
            { error, ideaId: idea.id },
            "Error transforming Aha! idea"
          );
          state.errors += 1;
        }
      }

      if (state.documents.length >= batchSize) {
        yield createSyncBatch(state.documents, cursor, true, state);
        state.documents = [];
      }
    }

    await onStageChange?.("Syncing features", state.processed, product.name);

    for await (const features of listFeatures(client, product.id)) {
      for (const feature of features) {
        try {
          state.documents.push(await transformFeature(feature, context));
          state.processed += 1;
        } catch (error) {
          logger.error(
            { error, featureId: feature.id },
            "Error transforming Aha! feature"
          );
          state.errors += 1;
        }
      }

      if (state.documents.length >= batchSize) {
        yield createSyncBatch(state.documents, cursor, true, state);
        state.documents = [];
      }
    }

    await onStageChange?.("Syncing releases", state.processed, product.name);

    for await (const releases of listReleases(client, product.id)) {
      for (const release of releases) {
        try {
          state.documents.push(await transformRelease(release, context));
          state.processed += 1;
        } catch (error) {
          logger.error(
            { error, releaseId: release.id },
            "Error transforming Aha! release"
          );
          state.errors += 1;
        }
      }

      if (state.documents.length >= batchSize) {
        yield createSyncBatch(state.documents, cursor, true, state);
        state.documents = [];
      }
    }

    if (syncInitiatives) {
      await onStageChange?.(
        "Syncing initiatives",
        state.processed,
        product.name
      );

      for await (const initiatives of listInitiatives(client, product.id)) {
        for (const initiative of initiatives) {
          try {
            state.documents.push(
              await transformInitiative(initiative, context)
            );
            state.processed += 1;
          } catch (error) {
            logger.error(
              { error, initiativeId: initiative.id },
              "Error transforming Aha! initiative"
            );
            state.errors += 1;
          }
        }

        if (state.documents.length >= batchSize) {
          yield createSyncBatch(state.documents, cursor, true, state);
          state.documents = [];
        }
      }
    }

    if (syncEpics) {
      await onStageChange?.("Syncing epics", state.processed, product.name);

      for await (const epics of listEpics(client, product.id)) {
        for (const epic of epics) {
          try {
            state.documents.push(await transformEpic(epic, context));
            state.processed += 1;
          } catch (error) {
            logger.error(
              { error, epicId: epic.id },
              "Error transforming Aha! epic"
            );
            state.errors += 1;
          }
        }

        if (state.documents.length >= batchSize) {
          yield createSyncBatch(state.documents, cursor, true, state);
          state.documents = [];
        }
      }
    }
  }

  logger.info(
    {
      processed: state.processed,
      skipped: state.skipped,
      errors: state.errors,
    },
    "Aha! full sync complete"
  );

  yield createSyncBatch(state.documents, cursor, false, state);
}
