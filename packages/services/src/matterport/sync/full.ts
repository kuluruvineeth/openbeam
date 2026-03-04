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

interface SyncState {
  documents: GenericDocument[];
  processed: number;
  skipped: number;
  errors: number;
}

export async function* fullSync(
  client: MatterportClient,
  context: MatterportTransformContext,
  options: MatterportFullSyncOptions = {}
): AsyncGenerator<MatterportSyncBatch<GenericDocument>, void, undefined> {
  const {
    batchSize = DEFAULT_BATCH_SIZE,
    modelIds,
    includeFloorPlans = true,
    onStageChange,
  } = options;

  logger.info(
    { connectorId: client.connectorId, modelIds },
    "Matterport full sync started"
  );

  const state: SyncState = {
    documents: [],
    processed: 0,
    skipped: 0,
    errors: 0,
  };

  const cursor: MatterportSyncCursor = {
    lastSyncTimestamp: Date.now(),
    lastModelModified: {},
    processedModelIds: [],
  };

  const models = modelIds ? modelIds : await fetchAllModelIds(client);

  await onStageChange?.("Syncing models", 0);

  for (const modelId of models) {
    try {
      await onStageChange?.("Processing model", state.processed, modelId);

      const details = await client.query<GetModelDetailsResponse>(
        GET_MODEL_DETAILS_QUERY,
        { modelId }
      );
      const model = details.model;

      cursor.lastModelModified[model.id] = model.modified;
      cursor.processedModelIds.push(model.id);

      state.documents.push(await transformModel(model, context));
      state.processed += 1;

      const modelParams = { modelId: model.id, modelName: model.name };

      if (includeFloorPlans) {
        for (const floor of model.floors) {
          state.documents.push(
            await transformFloor(floor, context, modelParams)
          );
          state.processed += 1;

          for (const room of floor.rooms) {
            state.documents.push(
              await transformRoom(room, context, modelParams)
            );
            state.processed += 1;
          }
        }
      }

      await onStageChange?.("Processing annotations", state.processed, modelId);
      for (const tag of model.mattertags) {
        state.documents.push(
          await transformMattertag(tag, context, modelParams)
        );
        state.processed += 1;
      }

      for (const sweep of model.sweeps) {
        state.documents.push(await transformSweep(sweep, context, modelParams));
        state.processed += 1;
      }

      if (state.documents.length >= batchSize) {
        yield createSyncBatch(state.documents, cursor, true, state);
        state.documents = [];
      }
    } catch (error) {
      logger.error({ error, modelId }, "Error processing Matterport model");
      state.errors += 1;
    }
  }

  logger.info(
    {
      processed: state.processed,
      skipped: state.skipped,
      errors: state.errors,
    },
    "Matterport full sync complete"
  );

  if (state.documents.length > 0) {
    yield createSyncBatch(state.documents, cursor, false, state);
  }
}

async function fetchAllModelIds(client: MatterportClient): Promise<string[]> {
  const ids: string[] = [];
  let offset = 0;

  while (true) {
    const response = await client.query<ListModelsResponse>(LIST_MODELS_QUERY, {
      offset,
      limit: DEFAULT_PAGE_SIZE,
    });

    for (const model of response.models.results) {
      ids.push(model.id);
    }

    offset += response.models.results.length;
    if (offset >= response.models.totalResults) {
      break;
    }
  }

  return ids;
}
