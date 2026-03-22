import type {
  GoogleChatSyncBatch,
  GoogleChatSyncCursor,
  GoogleChatTransformContext,
} from "@openbeam/types/services/connectors/google-chat";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import type { GoogleChatClient } from "../client";
import { transformMessage } from "../transformers/message";
import { type GoogleChatFullSyncOptions, googleChatFullSync } from "./full";

export async function* googleChatIncrementalSync(
  client: GoogleChatClient,
  context: GoogleChatTransformContext,
  options: {
    cursor?: GoogleChatSyncCursor;
    batchSize?: number;
    syncDirectMessages?: boolean;
    includeSpaces?: string[];
    excludeSpaces?: string[];
    lookbackDays?: number;
  } = {}
): AsyncGenerator<GoogleChatSyncBatch<GenericDocument>, void, undefined> {
  const { cursor, batchSize = 100 } = options;

  if (!(cursor?.lastSyncTime && cursor.lastFullSync)) {
    const fullOptions: GoogleChatFullSyncOptions = {
      batchSize,
      syncDirectMessages: options.syncDirectMessages,
      includeSpaces: options.includeSpaces,
      excludeSpaces: options.excludeSpaces,
      lookbackDays: options.lookbackDays,
    };
    yield* googleChatFullSync(client, context, fullOptions);
    return;
  }

  const includeSet = options.includeSpaces?.length
    ? new Set(options.includeSpaces.map((s) => s.toLowerCase()))
    : undefined;
  const excludeSet = options.excludeSpaces?.length
    ? new Set(options.excludeSpaces.map((s) => s.toLowerCase()))
    : undefined;

  const sinceTime = new Date(cursor.lastSyncTime).toISOString();
  let documents: GenericDocument[] = [];
  let processed = 0;
  const skipped = 0;
  let errors = 0;

  const spaces: Array<{ name: string; displayName: string; type: string }> = [];

  for await (const batch of client.listSpaces()) {
    for (const space of batch) {
      if (space.type === "DM" && !options.syncDirectMessages) {
        continue;
      }
      const displayLower = (space.displayName || "").toLowerCase();
      if (includeSet && !includeSet.has(displayLower)) {
        continue;
      }
      if (excludeSet?.has(displayLower)) {
        continue;
      }
      spaces.push({
        name: space.name,
        displayName: space.displayName,
        type: space.type,
      });
    }
  }

  logger.info(
    { connectorId: client.connectorId, spaceCount: spaces.length, sinceTime },
    "Google Chat incremental sync starting"
  );

  for (const space of spaces) {
    const filter = `createTime > "${sinceTime}"`;

    for await (const messageBatch of client.listMessages(space.name, {
      filter,
      orderBy: "createTime ASC",
    })) {
      for (const message of messageBatch) {
        if (message.deletionMetadata) {
          documents.push({
            id: `${context.connectorId}_message_${message.name.split("/").pop()}`,
            connector_id: context.connectorId,
            connector_type: context.connectorType,
            team_id: context.teamId,
            workspace_id: context.workspaceId,
            external_id: message.name.split("/").pop() ?? "",
            document_type: "message",
            title: "",
            content: "",
            created_at: 0,
            updated_at: Date.now(),
            is_public: false,
            metadata: { deleted: true },
          } as unknown as GenericDocument);
          processed += 1;
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
          cursor: {
            lastSyncTime: Date.now(),
            lastFullSync: cursor.lastFullSync,
          },
          hasMore: true,
          stats: { processed, skipped, errors },
        };
        documents = [];
      }
    }
  }

  yield {
    items: documents,
    cursor: {
      lastSyncTime: Date.now(),
      lastFullSync: cursor.lastFullSync,
    },
    hasMore: false,
    stats: { processed, skipped, errors },
  };
}
