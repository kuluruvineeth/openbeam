import type {
  GoogleChatSyncBatch,
  GoogleChatSyncCursor,
  GoogleChatTransformContext,
} from "@openbeam/types/services/connectors/google-chat";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import type { GoogleChatClient } from "../client";
import { transformMessage } from "../transformers/message";
import { transformSpace } from "../transformers/space";

export type GoogleChatFullSyncOptions = {
  batchSize?: number;
  syncDirectMessages?: boolean;
  includeSpaces?: string[];
  excludeSpaces?: string[];
  lookbackDays?: number;
};

export async function* googleChatFullSync(
  client: GoogleChatClient,
  context: GoogleChatTransformContext,
  options: GoogleChatFullSyncOptions = {}
): AsyncGenerator<GoogleChatSyncBatch<GenericDocument>, void, undefined> {
  const batchSize = options.batchSize ?? 100;
  let documents: GenericDocument[] = [];
  let processed = 0;
  let skipped = 0;
  let errors = 0;

  const includeSet = options.includeSpaces?.length
    ? new Set(options.includeSpaces.map((s) => s.toLowerCase()))
    : undefined;
  const excludeSet = options.excludeSpaces?.length
    ? new Set(options.excludeSpaces.map((s) => s.toLowerCase()))
    : undefined;

  const lookbackFilter = options.lookbackDays
    ? new Date(Date.now() - options.lookbackDays * 86_400_000).toISOString()
    : undefined;

  const spaces: Array<{ name: string; displayName: string; type: string }> = [];

  for await (const batch of client.listSpaces()) {
    for (const space of batch) {
      if (space.type === "DM" && !options.syncDirectMessages) {
        skipped += 1;
        continue;
      }

      const displayLower = (space.displayName || "").toLowerCase();
      if (includeSet && !includeSet.has(displayLower)) {
        skipped += 1;
        continue;
      }
      if (excludeSet?.has(displayLower)) {
        skipped += 1;
        continue;
      }

      spaces.push({
        name: space.name,
        displayName: space.displayName,
        type: space.type,
      });

      try {
        const doc = transformSpace(space, context);
        documents.push(doc);
        processed += 1;
      } catch (error) {
        logger.error(
          { error, spaceName: space.name },
          "Error transforming space"
        );
        errors += 1;
      }
    }
  }

  logger.info(
    { connectorId: client.connectorId, spaceCount: spaces.length, skipped },
    "Google Chat full sync starting messages"
  );

  if (documents.length >= batchSize) {
    yield {
      items: documents,
      cursor: { lastSyncTime: Date.now() },
      hasMore: true,
      stats: { processed, skipped, errors },
    };
    documents = [];
  }

  for (const space of spaces) {
    const filterParts: string[] = [];
    if (lookbackFilter) {
      filterParts.push(`createTime > "${lookbackFilter}"`);
    }
    const filter =
      filterParts.length > 0 ? filterParts.join(" AND ") : undefined;

    for await (const messageBatch of client.listMessages(space.name, {
      filter,
      orderBy: "createTime ASC",
    })) {
      for (const message of messageBatch) {
        if (message.deletionMetadata) {
          skipped += 1;
          continue;
        }

        try {
          const doc = transformMessage(message, context, space.displayName);
          documents.push(doc);
          processed += 1;
        } catch (error) {
          logger.error(
            { error, messageName: message.name },
            "Error transforming message"
          );
          errors += 1;
        }
      }

      if (documents.length >= batchSize) {
        yield {
          items: documents,
          cursor: { lastSyncTime: Date.now() },
          hasMore: true,
          stats: { processed, skipped, errors },
        };
        documents = [];
      }
    }
  }

  const cursor: GoogleChatSyncCursor = {
    lastSyncTime: Date.now(),
    lastFullSync: Date.now(),
  };

  yield {
    items: documents,
    cursor,
    hasMore: false,
    stats: { processed, skipped, errors },
  };
}
