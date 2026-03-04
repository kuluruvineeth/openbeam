import type {
  NucleusFileInfo,
  OmniverseFullSyncOptions,
  OmniverseSyncBatch,
  OmniverseSyncCursor,
  OmniverseTransformContext,
  UsdStageParseResult,
} from "@openplane/types/services/connectors/omniverse";
import type { GenericDocument } from "@openplane/vespa";
import { logger } from "../../lib/logger";
import type { OmniverseClient } from "../client";
import { transformPrim } from "../transformers/prim";
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 100;

interface SyncState {
  documents: GenericDocument[];
  processed: number;
  skipped: number;
  errors: number;
}

export async function* fullSync(
  client: OmniverseClient,
  context: OmniverseTransformContext,
  options: OmniverseFullSyncOptions
): AsyncGenerator<OmniverseSyncBatch<GenericDocument>, void, undefined> {
  const {
    stagePaths,
    batchSize = DEFAULT_BATCH_SIZE,
    primTypeFilters,
    depthLimit,
    includeInactive = false,
    onStageChange,
  } = options;

  logger.info(
    { connectorId: client.connectorId, stageCount: stagePaths.length },
    "Omniverse full sync started"
  );

  const state: SyncState = {
    documents: [],
    processed: 0,
    skipped: 0,
    errors: 0,
  };

  const cursor: OmniverseSyncCursor = {
    lastSyncTimestamp: Date.now(),
    scannedStages: [],
    currentStageIndex: 0,
  };

  for (let i = 0; i < stagePaths.length; i++) {
    const stagePath = stagePaths[i] as string;
    cursor.currentStageIndex = i;

    try {
      await onStageChange?.("Parsing stage", state.processed, stagePath);

      const stageInfo = await client.get<NucleusFileInfo>(
        "/omni/api/files/info",
        { path: stagePath }
      );

      cursor.lastModifiedVersion = stageInfo.version;

      const parseResult = await client.post<UsdStageParseResult>(
        "/omni/api/stages/parse",
        {
          path: stagePath,
          depthLimit,
          primTypeFilters,
        }
      );

      for (const prim of parseResult.prims) {
        if (!(includeInactive || prim.isActive)) {
          state.skipped += 1;
          continue;
        }

        try {
          state.documents.push(
            await transformPrim(prim, context, { stagePath })
          );
          state.processed += 1;

          if (state.documents.length >= batchSize) {
            yield createSyncBatch(state.documents, cursor, true, state);
            state.documents = [];
          }
        } catch (error) {
          logger.error(
            { error, primPath: prim.path },
            "Error processing Omniverse prim"
          );
          state.errors += 1;
        }
      }

      cursor.scannedStages.push(stagePath);
    } catch (error) {
      logger.error({ error, stagePath }, "Error processing Omniverse stage");
      state.errors += 1;
    }
  }

  logger.info(
    {
      processed: state.processed,
      skipped: state.skipped,
      errors: state.errors,
    },
    "Omniverse full sync complete"
  );

  if (state.documents.length > 0) {
    yield createSyncBatch(state.documents, cursor, false, state);
  }
}
