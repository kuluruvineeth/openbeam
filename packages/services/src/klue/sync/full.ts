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
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;

interface SyncState {
  documents: GenericDocument[];
  processed: number;
  skipped: number;
  errors: number;
}

export async function* klueFullSync(
  client: KlueClient,
  context: KlueTransformContext,
  options: KlueSyncOptions = {}
): AsyncGenerator<KlueSyncBatch<GenericDocument>, void, undefined> {
  const {
    batchSize = DEFAULT_BATCH_SIZE,
    syncBoards = true,
    onStageChange,
  } = options;

  logger.info(
    { connectorId: client.connectorId, syncBoards },
    "Klue full sync started"
  );

  const state: SyncState = {
    documents: [],
    processed: 0,
    skipped: 0,
    errors: 0,
  };

  const cursor: KlueSyncCursor = {
    lastSyncTime: Date.now(),
    lastFullSync: Date.now(),
  };

  await onStageChange?.("Syncing competitors", state.processed);

  for await (const competitors of listCompetitors(client)) {
    for (const competitor of competitors) {
      try {
        state.documents.push(await transformCompetitor(competitor, context));
        state.processed += 1;
      } catch (error) {
        logger.error(
          { error, competitorId: competitor.id },
          "Error transforming Klue competitor"
        );
        state.errors += 1;
      }
    }

    if (state.documents.length >= batchSize) {
      yield createSyncBatch(state.documents, cursor, true, state);
      state.documents = [];
    }
  }

  await onStageChange?.("Syncing battlecards", state.processed);

  for await (const battlecards of listBattlecards(client)) {
    for (const battlecard of battlecards) {
      try {
        state.documents.push(await transformBattlecard(battlecard, context));
        state.processed += 1;
      } catch (error) {
        logger.error(
          { error, battlecardId: battlecard.id },
          "Error transforming Klue battlecard"
        );
        state.errors += 1;
      }
    }

    if (state.documents.length >= batchSize) {
      yield createSyncBatch(state.documents, cursor, true, state);
      state.documents = [];
    }
  }

  await onStageChange?.("Syncing intel", state.processed);

  for await (const intelItems of listIntel(client)) {
    for (const intel of intelItems) {
      try {
        state.documents.push(await transformIntel(intel, context));
        state.processed += 1;
      } catch (error) {
        logger.error(
          { error, intelId: intel.id },
          "Error transforming Klue intel"
        );
        state.errors += 1;
      }
    }

    if (state.documents.length >= batchSize) {
      yield createSyncBatch(state.documents, cursor, true, state);
      state.documents = [];
    }
  }

  if (syncBoards) {
    await onStageChange?.("Syncing boards", state.processed);

    for await (const boards of listBoards(client)) {
      for (const board of boards) {
        try {
          state.documents.push(await transformBoard(board, context));
          state.processed += 1;
        } catch (error) {
          logger.error(
            { error, boardId: board.id },
            "Error transforming Klue board"
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
    "Klue full sync complete"
  );

  yield createSyncBatch(state.documents, cursor, false, state);
}
