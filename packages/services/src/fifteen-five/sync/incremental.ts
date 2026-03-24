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
import { fifteenFiveFullSync } from "./full";
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;

async function collectAllUsers(
  client: FifteenFiveClient
): Promise<Map<number, FifteenFiveUser>> {
  const allUsers: FifteenFiveUser[] = [];
  for await (const batch of listUsers(client)) {
    allUsers.push(...batch);
  }
  return buildUserLookup(allUsers);
}

export async function* fifteenFiveIncrementalSync(
  client: FifteenFiveClient,
  context: FifteenFiveTransformContext,
  options: FifteenFiveSyncOptions = {}
): AsyncGenerator<FifteenFiveSyncBatch<GenericDocument>, void, undefined> {
  const {
    cursor,
    batchSize = DEFAULT_BATCH_SIZE,
    syncReviews = true,
    syncHighFives = true,
    onStageChange,
  } = options;

  if (!(cursor?.lastSyncTime && cursor?.lastFullSync)) {
    yield* fifteenFiveFullSync(client, context, options);
    return;
  }

  logger.info(
    { connectorId: client.connectorId, lastSyncTime: cursor.lastSyncTime },
    "15Five incremental sync started"
  );

  const modifiedAfter = new Date(cursor.lastSyncTime).toISOString();
  let documents: GenericDocument[] = [];
  let processed = 0;
  let errors = 0;

  try {
    const userLookup = await collectAllUsers(client);

    await onStageChange?.("Syncing updated check-ins", processed);

    for await (const checkIns of listCheckIns(client, { modifiedAfter })) {
      for (const checkIn of checkIns) {
        try {
          documents.push(await transformCheckIn(checkIn, context, userLookup));
          processed += 1;
        } catch (error) {
          logger.error(
            { error, checkInId: checkIn.id },
            "Error transforming check-in in incremental sync"
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

    await onStageChange?.("Syncing updated objectives", processed);

    for await (const objectives of listObjectives(client, { modifiedAfter })) {
      for (const objective of objectives) {
        try {
          documents.push(
            await transformObjective(objective, context, userLookup)
          );
          processed += 1;
        } catch (error) {
          logger.error(
            { error, objectiveId: objective.id },
            "Error transforming objective in incremental sync"
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

    await onStageChange?.("Syncing updated key results", processed);

    for await (const keyResults of listKeyResults(client, { modifiedAfter })) {
      for (const kr of keyResults) {
        try {
          documents.push(await transformKeyResult(kr, context, userLookup));
          processed += 1;
        } catch (error) {
          logger.error(
            { error, keyResultId: kr.id },
            "Error transforming key result in incremental sync"
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

    if (syncHighFives) {
      for await (const highFives of listHighFives(client, {
        createdAfter: modifiedAfter,
      })) {
        for (const hf of highFives) {
          try {
            documents.push(await transformHighFive(hf, context, userLookup));
            processed += 1;
          } catch (error) {
            logger.error(
              { error, highFiveId: hf.id },
              "Error transforming high five in incremental sync"
            );
            errors += 1;
          }
        }
      }
    }

    if (syncReviews) {
      for await (const reviews of listReviews(client, { modifiedAfter })) {
        for (const review of reviews) {
          try {
            documents.push(await transformReview(review, context, userLookup));
            processed += 1;
          } catch (error) {
            logger.error(
              { error, reviewId: review.id },
              "Error transforming review in incremental sync"
            );
            errors += 1;
          }
        }
      }
    }

    const newCursor: FifteenFiveSyncCursor = {
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
      "15Five incremental sync failed, falling back to full"
    );
    yield* fifteenFiveFullSync(client, context, options);
  }
}
