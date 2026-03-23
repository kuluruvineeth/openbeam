import type {
  GuruSyncBatch,
  GuruSyncCursor,
  GuruSyncOptions,
  GuruTransformContext,
} from "@openbeam/types/services/connectors/guru";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import type { GuruClient } from "../client";
import type { GuruCard } from "../transformers/card";
import { transformCard } from "../transformers/card";
import type { GuruCollection } from "../transformers/collection";
import { transformCollection } from "../transformers/collection";
import type { GuruFolder } from "../transformers/folder";
import { transformFolder } from "../transformers/folder";
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;

interface SyncState {
  documents: GenericDocument[];
  processed: number;
  skipped: number;
  errors: number;
}

function parseCommaSeparated(value?: string): string[] {
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function shouldIncludeCollection(
  collectionName: string,
  include: string[],
  exclude: string[]
): boolean {
  const nameLower = collectionName.toLowerCase();
  if (
    exclude.length > 0 &&
    exclude.some((e) => nameLower === e.toLowerCase())
  ) {
    return false;
  }
  if (include.length > 0) {
    return include.some((i) => nameLower === i.toLowerCase());
  }
  return true;
}

export async function* fullSync(
  client: GuruClient,
  context: GuruTransformContext,
  options: GuruSyncOptions = {}
): AsyncGenerator<GuruSyncBatch<GenericDocument>, void, undefined> {
  const {
    batchSize = DEFAULT_BATCH_SIZE,
    syncCollections = true,
    syncFolders = true,
    verifiedOnly = false,
    onStageChange,
  } = options;

  const includeCollections = parseCommaSeparated(
    options.includeCollections?.join(",")
  );
  const excludeCollections = parseCommaSeparated(
    options.excludeCollections?.join(",")
  );

  logger.info(
    {
      connectorId: client.connectorId,
      syncCollections,
      syncFolders,
      verifiedOnly,
    },
    "Guru full sync started"
  );

  const state: SyncState = {
    documents: [],
    processed: 0,
    skipped: 0,
    errors: 0,
  };

  const cursor: GuruSyncCursor = {
    lastSyncTime: Date.now(),
  };

  let latestModifiedAt: string | undefined;

  let collections: GuruCollection[] = [];
  if (
    syncCollections ||
    includeCollections.length > 0 ||
    excludeCollections.length > 0
  ) {
    await onStageChange?.("Fetching collections", state.processed);
    collections = await client.get<GuruCollection[]>("/collections");
  }

  const collectionIdFilter = new Set<string>();
  if (includeCollections.length > 0 || excludeCollections.length > 0) {
    for (const col of collections) {
      if (
        shouldIncludeCollection(
          col.name,
          includeCollections,
          excludeCollections
        )
      ) {
        collectionIdFilter.add(col.id);
      }
    }
  }

  if (syncCollections) {
    await onStageChange?.("Processing collections", state.processed);
    for (const collection of collections) {
      if (
        collectionIdFilter.size > 0 &&
        !collectionIdFilter.has(collection.id)
      ) {
        state.skipped += 1;
        continue;
      }

      try {
        await onStageChange?.(
          "Processing collections",
          state.processed,
          collection.name
        );
        state.documents.push(await transformCollection(collection, context));
        state.processed += 1;

        if (state.documents.length >= batchSize) {
          yield createSyncBatch(state.documents, cursor, true, state);
          state.documents = [];
        }
      } catch (error) {
        logger.error(
          { error, collectionId: collection.id },
          "Error processing Guru collection"
        );
        state.errors += 1;
      }
    }
  }

  if (syncFolders) {
    await onStageChange?.("Syncing folders", state.processed);
    for (const collection of collections) {
      if (
        collectionIdFilter.size > 0 &&
        !collectionIdFilter.has(collection.id)
      ) {
        continue;
      }

      try {
        const folders = await client.get<GuruFolder[]>(
          `/folders?collection=${collection.id}`
        );
        for (const folder of folders) {
          try {
            folder.collection = { id: collection.id, name: collection.name };
            await onStageChange?.(
              "Processing folders",
              state.processed,
              folder.title
            );
            state.documents.push(await transformFolder(folder, context));
            state.processed += 1;

            if (state.documents.length >= batchSize) {
              yield createSyncBatch(state.documents, cursor, true, state);
              state.documents = [];
            }
          } catch (error) {
            logger.error(
              { error, folderId: folder.id },
              "Error processing Guru folder"
            );
            state.errors += 1;
          }
        }
      } catch (error) {
        logger.error(
          { error, collectionId: collection.id },
          "Error fetching folders for Guru collection"
        );
        state.errors += 1;
      }
    }
  }

  await onStageChange?.("Syncing cards", state.processed);

  for await (const page of client.getPaginated<GuruCard>("/search/cardmgr")) {
    for (const card of page) {
      try {
        if (
          collectionIdFilter.size > 0 &&
          card.collection &&
          !collectionIdFilter.has(card.collection.id)
        ) {
          state.skipped += 1;
          continue;
        }

        if (verifiedOnly && card.verificationState !== "TRUSTED") {
          state.skipped += 1;
          continue;
        }

        if (
          card.lastModified &&
          (!latestModifiedAt || card.lastModified > latestModifiedAt)
        ) {
          latestModifiedAt = card.lastModified;
        }

        await onStageChange?.(
          "Processing cards",
          state.processed,
          card.preferredPhrase
        );

        state.documents.push(await transformCard(card, context));
        state.processed += 1;

        if (state.documents.length >= batchSize) {
          cursor.lastCardModifiedAt = latestModifiedAt;
          yield createSyncBatch(state.documents, cursor, true, state);
          state.documents = [];
        }
      } catch (error) {
        logger.error({ error, cardId: card.id }, "Error processing Guru card");
        state.errors += 1;
      }
    }
  }

  cursor.lastCardModifiedAt = latestModifiedAt;

  logger.info(
    {
      processed: state.processed,
      skipped: state.skipped,
      errors: state.errors,
    },
    "Guru full sync complete"
  );

  if (state.documents.length > 0) {
    yield createSyncBatch(state.documents, cursor, false, state);
  }
}
