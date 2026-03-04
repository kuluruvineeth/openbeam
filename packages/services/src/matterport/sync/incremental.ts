import type {
  MatterportFullSyncOptions,
  MatterportSyncBatch,
  MatterportSyncCursor,
  MatterportTransformContext,
} from "@openplane/types/services/connectors/matterport";
import type { GenericDocument } from "@openplane/vespa";
import { logger } from "../../lib/logger";
import {
  GET_MODEL_DETAILS_QUERY,
  type GetModelDetailsResponse,
  LIST_MODELS_QUERY,
  type ListModelsResponse,
} from "../api/queries";
import type { MatterportClient } from "../client";
import { transformFloor } from "../transformers/floor";
import { transformMattertag } from "../transformers/mattertag";
import { transformModel } from "../transformers/model";
import { transformRoom } from "../transformers/room";
import { transformSweep } from "../transformers/sweep";
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_PAGE_SIZE = 20;

export interface IncrementalSyncOptions extends MatterportFullSyncOptions {
  previousCursor: MatterportSyncCursor;
}

export async function* incrementalSync(
  client: MatterportClient,
  context: MatterportTransformContext,
  options: IncrementalSyncOptions
): AsyncGenerator<MatterportSyncBatch<GenericDocument>, void, undefined> {
  const {
    previousCursor,
    batchSize = DEFAULT_BATCH_SIZE,
    includeFloorPlans = true,
    onStageChange,
  } = options;

  logger.info(
    {
      connectorId: client.connectorId,
      lastSync: new Date(previousCursor.lastSyncTimestamp).toISOString(),
    },
    "Matterport incremental sync started"
  );

  let documents: GenericDocument[] = [];
  let processed = 0;
  let errors = 0;

  const cursor: MatterportSyncCursor = {
    lastSyncTimestamp: Date.now(),
    lastModelModified: { ...previousCursor.lastModelModified },
    processedModelIds: [...previousCursor.processedModelIds],
  };

  await onStageChange?.("Checking for updated models", 0);

  const updatedModelIds = await findUpdatedModels(
    client,
    previousCursor.lastModelModified
  );

  if (updatedModelIds.length === 0) {
    logger.info("No updated models found, skipping incremental sync");
    return;
  }

  logger.info(
    { updatedCount: updatedModelIds.length },
    "Found updated Matterport models"
  );

  for (const modelId of updatedModelIds) {
    try {
      await onStageChange?.("Processing updated model", processed, modelId);

      const details = await client.query<GetModelDetailsResponse>(
        GET_MODEL_DETAILS_QUERY,
        { modelId }
      );
      const model = details.model;

      cursor.lastModelModified[model.id] = model.modified;
      if (!cursor.processedModelIds.includes(model.id)) {
        cursor.processedModelIds.push(model.id);
      }

      documents.push(await transformModel(model, context));
      processed += 1;

      const modelParams = { modelId: model.id, modelName: model.name };

      if (includeFloorPlans) {
        for (const floor of model.floors) {
          documents.push(await transformFloor(floor, context, modelParams));
          processed += 1;

          for (const room of floor.rooms) {
            documents.push(await transformRoom(room, context, modelParams));
            processed += 1;
          }
        }
      }

      for (const tag of model.mattertags) {
        documents.push(await transformMattertag(tag, context, modelParams));
        processed += 1;
      }

      for (const sweep of model.sweeps) {
        documents.push(await transformSweep(sweep, context, modelParams));
        processed += 1;
      }

      if (documents.length >= batchSize) {
        yield createSyncBatch(documents, cursor, true, {
          processed,
          skipped: 0,
          errors,
        });
        documents = [];
      }
    } catch (error) {
      logger.error(
        { error, modelId },
        "Error processing updated Matterport model"
      );
      errors += 1;
    }
  }

  logger.info({ processed, errors }, "Matterport incremental sync complete");

  if (documents.length > 0) {
    yield createSyncBatch(documents, cursor, false, {
      processed,
      skipped: 0,
      errors,
    });
  }
}

async function findUpdatedModels(
  client: MatterportClient,
  lastKnownModified: Record<string, string>
): Promise<string[]> {
  const updated: string[] = [];
  let offset = 0;

  while (true) {
    const response = await client.query<ListModelsResponse>(LIST_MODELS_QUERY, {
      offset,
      limit: DEFAULT_PAGE_SIZE,
    });

    for (const model of response.models.results) {
      const lastModified = lastKnownModified[model.id];
      if (!lastModified || model.modified > lastModified) {
        updated.push(model.id);
      }
    }

    offset += response.models.results.length;
    if (offset >= response.models.totalResults) {
      break;
    }
  }

  return updated;
}
