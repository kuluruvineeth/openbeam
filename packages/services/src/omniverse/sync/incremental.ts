import type {
  NucleusFileInfo,
  OmniverseFullSyncOptions,
  OmniverseSyncBatch,
  OmniverseSyncCursor,
  OmniverseTransformContext,
  UsdStageParseResult,
} from "@openbeam/types/services/connectors/omniverse";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import type { OmniverseClient } from "../client";
import { transformPrim } from "../transformers/prim";
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 100;

export interface IncrementalSyncOptions extends OmniverseFullSyncOptions {
  previousCursor: OmniverseSyncCursor;
}

export async function* incrementalSync(
  client: OmniverseClient,
  context: OmniverseTransformContext,
  options: IncrementalSyncOptions
): AsyncGenerator<OmniverseSyncBatch<GenericDocument>, void, undefined> {
  const {
    previousCursor,
    stagePaths,
    batchSize = DEFAULT_BATCH_SIZE,
    primTypeFilters,
    depthLimit,
    includeInactive = false,
    onStageChange,
  } = options;

  logger.info(
    {
      connectorId: client.connectorId,
      lastSync: new Date(previousCursor.lastSyncTimestamp).toISOString(),
    },
    "Omniverse incremental sync started"
  );

  let documents: GenericDocument[] = [];
  let processed = 0;
  let errors = 0;

  const cursor: OmniverseSyncCursor = {
    lastSyncTimestamp: Date.now(),
    scannedStages: [],
    currentStageIndex: 0,
  };

  for (let i = 0; i < stagePaths.length; i++) {
    const stagePath = stagePaths[i] as string;
    cursor.currentStageIndex = i;

    try {
      await onStageChange?.("Checking stage for changes", processed, stagePath);

      const stageInfo = await client.get<NucleusFileInfo>(
        "/omni/api/files/info",
        { path: stagePath }
      );

      if (
        stageInfo.version === previousCursor.lastModifiedVersion &&
        previousCursor.scannedStages.includes(stagePath)
      ) {
        cursor.scannedStages.push(stagePath);
        continue;
      }

      cursor.lastModifiedVersion = stageInfo.version;

      const parseResult = await client.post<UsdStageParseResult>(
        "/omni/api/stages/parse",
        { path: stagePath, depthLimit, primTypeFilters }
      );

      for (const prim of parseResult.prims) {
        if (!(includeInactive || prim.isActive)) {
          continue;
        }

        try {
          documents.push(await transformPrim(prim, context, { stagePath }));
          processed += 1;

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
            { error, primPath: prim.path },
            "Error processing updated prim"
          );
          errors += 1;
        }
      }

      cursor.scannedStages.push(stagePath);
    } catch (error) {
      logger.error(
        { error, stagePath },
        "Error checking Omniverse stage for changes"
      );
      errors += 1;
    }
  }

  logger.info({ processed, errors }, "Omniverse incremental sync complete");

  if (documents.length > 0) {
    yield createSyncBatch(documents, cursor, false, {
      processed,
      skipped: 0,
      errors,
    });
  }
}
