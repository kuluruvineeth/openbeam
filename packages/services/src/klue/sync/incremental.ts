import type {
  KlueSyncBatch,
  KlueSyncCursor,
  KlueSyncOptions,
  KlueTransformContext,
} from "@openbeam/types/services/connectors/klue";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { listBattlecards } from "../api/battlecards";
import { listBoards } from "../api/boards";
import { listCompetitors } from "../api/competitors";
import { listIntel } from "../api/intel";
import type { KlueClient } from "../client";
import { transformBattlecard } from "../transformers/battlecard";
import { transformBoard } from "../transformers/board";
import { transformCompetitor } from "../transformers/competitor";
import { transformIntel } from "../transformers/intel";
import { klueFullSync } from "./full";
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;

export async function* klueIncrementalSync(
  client: KlueClient,
  context: KlueTransformContext,
  options: KlueSyncOptions = {}
): AsyncGenerator<KlueSyncBatch<GenericDocument>, void, undefined> {
  const {
    cursor,
    batchSize = DEFAULT_BATCH_SIZE,
    syncBoards = true,
    onStageChange,
  } = options;

  if (!(cursor?.lastSyncTime && cursor?.lastFullSync)) {
    yield* klueFullSync(client, context, options);
    return;
  }

  logger.info(
    { connectorId: client.connectorId, lastSyncTime: cursor.lastSyncTime },
    "Klue incremental sync started"
  );

  const updatedSince = new Date(cursor.lastSyncTime).toISOString();
  let documents: GenericDocument[] = [];
  let processed = 0;
  let errors = 0;

  try {
    await onStageChange?.("Syncing updated competitors", processed);

    for await (const competitors of listCompetitors(client, {
      updatedSince,
    })) {
      for (const competitor of competitors) {
        try {
          documents.push(await transformCompetitor(competitor, context));
          processed += 1;
        } catch (error) {
          logger.error(
            { error, competitorId: competitor.id },
            "Error transforming competitor in incremental sync"
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

    await onStageChange?.("Syncing updated battlecards", processed);

    for await (const battlecards of listBattlecards(client, {
      updatedSince,
    })) {
      for (const battlecard of battlecards) {
        try {
          documents.push(await transformBattlecard(battlecard, context));
          processed += 1;
        } catch (error) {
          logger.error(
            { error, battlecardId: battlecard.id },
            "Error transforming battlecard in incremental sync"
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

    await onStageChange?.("Syncing updated intel", processed);

    for await (const intelItems of listIntel(client, { updatedSince })) {
      for (const intel of intelItems) {
        try {
          documents.push(await transformIntel(intel, context));
          processed += 1;
        } catch (error) {
          logger.error(
            { error, intelId: intel.id },
            "Error transforming intel in incremental sync"
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

    if (syncBoards) {
      for await (const boards of listBoards(client, { updatedSince })) {
        for (const board of boards) {
          try {
            documents.push(await transformBoard(board, context));
            processed += 1;
          } catch (error) {
            logger.error(
              { error, boardId: board.id },
              "Error transforming board in incremental sync"
            );
            errors += 1;
          }
        }
      }
    }

    const newCursor: KlueSyncCursor = {
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
      "Klue incremental sync failed, falling back to full"
    );
    yield* klueFullSync(client, context, options);
  }
}
