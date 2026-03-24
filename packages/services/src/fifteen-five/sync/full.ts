import type {
  FifteenFiveSyncBatch,
  FifteenFiveSyncCursor,
  FifteenFiveSyncOptions,
  FifteenFiveTransformContext,
} from "@openbeam/types/services/connectors/fifteen-five";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { listCheckIns } from "../api/check-ins";
import { listHighFives } from "../api/high-fives";
import { listKeyResults } from "../api/key-results";
import { listObjectives } from "../api/objectives";
import { listReviews } from "../api/reviews";
import type { FifteenFiveUser } from "../api/users";
import { buildUserLookup, listUsers } from "../api/users";
import type { FifteenFiveClient } from "../client";
import { transformCheckIn } from "../transformers/check-in";
import { transformHighFive } from "../transformers/high-five";
import { transformKeyResult } from "../transformers/key-result";
import { transformObjective } from "../transformers/objective";
import { transformReview } from "../transformers/review";
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;

interface SyncState {
  documents: GenericDocument[];
  processed: number;
  skipped: number;
  errors: number;
}

async function collectAllUsers(
  client: FifteenFiveClient
): Promise<Map<number, FifteenFiveUser>> {
  const allUsers: FifteenFiveUser[] = [];
  for await (const batch of listUsers(client)) {
    allUsers.push(...batch);
  }
  return buildUserLookup(allUsers);
}

export async function* fifteenFiveFullSync(
  client: FifteenFiveClient,
  context: FifteenFiveTransformContext,
  options: FifteenFiveSyncOptions = {}
): AsyncGenerator<FifteenFiveSyncBatch<GenericDocument>, void, undefined> {
  const {
    batchSize = DEFAULT_BATCH_SIZE,
    syncReviews = true,
    syncHighFives = true,
    onStageChange,
  } = options;

  logger.info(
    {
      connectorId: client.connectorId,
      syncReviews,
      syncHighFives,
    },
    "15Five full sync started"
  );

  const state: SyncState = {
    documents: [],
    processed: 0,
    skipped: 0,
    errors: 0,
  };

  const cursor: FifteenFiveSyncCursor = {
    lastSyncTime: Date.now(),
    lastFullSync: Date.now(),
  };

  await onStageChange?.("Fetching users", state.processed);
  const userLookup = await collectAllUsers(client);

  await onStageChange?.("Syncing check-ins", state.processed);

  for await (const checkIns of listCheckIns(client)) {
    for (const checkIn of checkIns) {
      try {
        state.documents.push(
          await transformCheckIn(checkIn, context, userLookup)
        );
        state.processed += 1;
      } catch (error) {
        logger.error(
          { error, checkInId: checkIn.id },
          "Error transforming 15Five check-in"
        );
        state.errors += 1;
      }
    }

    if (state.documents.length >= batchSize) {
      yield createSyncBatch(state.documents, cursor, true, state);
      state.documents = [];
    }
  }

  await onStageChange?.("Syncing objectives", state.processed);

  for await (const objectives of listObjectives(client)) {
    for (const objective of objectives) {
      try {
        state.documents.push(
          await transformObjective(objective, context, userLookup)
        );
        state.processed += 1;
      } catch (error) {
        logger.error(
          { error, objectiveId: objective.id },
          "Error transforming 15Five objective"
        );
        state.errors += 1;
      }
    }

    if (state.documents.length >= batchSize) {
      yield createSyncBatch(state.documents, cursor, true, state);
      state.documents = [];
    }
  }

  await onStageChange?.("Syncing key results", state.processed);

  for await (const keyResults of listKeyResults(client)) {
    for (const kr of keyResults) {
      try {
        state.documents.push(await transformKeyResult(kr, context, userLookup));
        state.processed += 1;
      } catch (error) {
        logger.error(
          { error, keyResultId: kr.id },
          "Error transforming 15Five key result"
        );
        state.errors += 1;
      }
    }

    if (state.documents.length >= batchSize) {
      yield createSyncBatch(state.documents, cursor, true, state);
      state.documents = [];
    }
  }

  if (syncHighFives) {
    await onStageChange?.("Syncing high fives", state.processed);

    for await (const highFives of listHighFives(client)) {
      for (const hf of highFives) {
        try {
          state.documents.push(
            await transformHighFive(hf, context, userLookup)
          );
          state.processed += 1;
        } catch (error) {
          logger.error(
            { error, highFiveId: hf.id },
            "Error transforming 15Five high five"
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

  if (syncReviews) {
    await onStageChange?.("Syncing reviews", state.processed);

    for await (const reviews of listReviews(client)) {
      for (const review of reviews) {
        try {
          state.documents.push(
            await transformReview(review, context, userLookup)
          );
          state.processed += 1;
        } catch (error) {
          logger.error(
            { error, reviewId: review.id },
            "Error transforming 15Five review"
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

  logger.info(
    {
      processed: state.processed,
      skipped: state.skipped,
      errors: state.errors,
    },
    "15Five full sync complete"
  );

  yield createSyncBatch(state.documents, cursor, false, state);
}
