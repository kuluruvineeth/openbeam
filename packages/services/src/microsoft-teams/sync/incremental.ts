import type {
  TeamsSyncBatch,
  TeamsSyncCursor,
  TeamsTransformContext,
} from "@openbeam/types/services/connectors/teams";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import type { MicrosoftGraphClient } from "../../microsoft/client";
import { MicrosoftGraphApiError } from "../../microsoft/types";
import { transformTeamsMessage } from "../transformers/message";
import { teamsFullSync } from "./full";

type TeamsMessage = {
  id: string;
  messageType: string;
  createdDateTime: string;
  lastModifiedDateTime?: string;
  subject?: string;
  body: { contentType: string; content: string };
  from?: {
    user?: { displayName?: string; id?: string; userIdentityType?: string };
  };
  webUrl?: string;
  importance?: string;
  attachments?: Array<{
    id: string;
    name?: string;
    contentType?: string;
    contentUrl?: string;
  }>;
  "@removed"?: { reason: string };
};

function isDeltaExpiredError(error: unknown): boolean {
  if (error instanceof MicrosoftGraphApiError) {
    return error.statusCode === 410 || error.code === "syncStateNotFound";
  }
  return false;
}

export async function* teamsIncrementalSync(
  client: MicrosoftGraphClient,
  context: TeamsTransformContext,
  options: { cursor?: TeamsSyncCursor; batchSize?: number } = {}
): AsyncGenerator<TeamsSyncBatch<GenericDocument>, void, undefined> {
  const { cursor, batchSize = 100 } = options;

  if (
    !(cursor?.channelDeltaLinks && cursor?.lastFullSync) ||
    Object.keys(cursor.channelDeltaLinks).length === 0
  ) {
    yield* teamsFullSync(client, context, { batchSize });
    return;
  }

  let documents: GenericDocument[] = [];
  let processed = 0;
  let skipped = 0;
  let errors = 0;
  const newDeltaLinks: Record<string, string> = {
    ...cursor.channelDeltaLinks,
  };
  const newChannelMeta = { ...cursor.channelMeta };

  for (const [key, deltaLink] of Object.entries(cursor.channelDeltaLinks)) {
    const parts = key.split(":");
    const teamId = parts[0] ?? "";
    const channelId = parts[1] ?? "";
    const meta = cursor.channelMeta?.[key] ?? {
      teamName: "",
      channelName: "",
    };

    try {
      for await (const page of client.deltaPages<TeamsMessage>(
        `/teams/${teamId}/channels/${channelId}/messages/delta`,
        deltaLink
      )) {
        if (page.deltaLink) {
          newDeltaLinks[key] = page.deltaLink;
        }

        for (const message of page.items) {
          if (message["@removed"]) {
            skipped += 1;
            continue;
          }
          if (message.messageType !== "message") {
            skipped += 1;
            continue;
          }

          try {
            const doc = transformTeamsMessage(message, context, {
              teamName: meta.teamName,
              channelName: meta.channelName,
              teamId,
              channelId,
            });
            documents.push(doc);
            processed += 1;

            try {
              const repliesResponse = await client.get<{
                value: TeamsMessage[];
              }>(
                `/teams/${teamId}/channels/${channelId}/messages/${message.id}/replies`
              );
              for (const reply of repliesResponse.value) {
                if (reply.messageType !== "message") {
                  skipped += 1;
                  continue;
                }
                const replyDoc = transformTeamsMessage(reply, context, {
                  teamName: meta.teamName,
                  channelName: meta.channelName,
                  teamId,
                  channelId,
                  parentMessageId: message.id,
                });
                documents.push(replyDoc);
                processed += 1;
              }
            } catch (replyError) {
              logger.warn(
                { error: replyError, messageId: message.id },
                "Failed to fetch replies"
              );
            }

            if (documents.length >= batchSize) {
              yield {
                items: documents,
                cursor: {
                  channelDeltaLinks: { ...newDeltaLinks },
                  teamIds: cursor.teamIds,
                  channelMeta: { ...newChannelMeta },
                  lastFullSync: cursor.lastFullSync,
                },
                hasMore: true,
                stats: { processed, skipped, errors },
              };
              documents = [];
            }
          } catch (error) {
            logger.error(
              { error, messageId: message.id },
              "Failed to transform Teams message"
            );
            errors += 1;
          }
        }
      }
    } catch (error) {
      if (isDeltaExpiredError(error)) {
        logger.warn(
          { key },
          "Delta token expired for channel, will re-sync on next full sync"
        );
        delete newDeltaLinks[key];
      } else {
        logger.error({ error, key }, "Failed to fetch delta for channel");
      }
      errors += 1;
    }
  }

  yield {
    items: documents,
    cursor: {
      channelDeltaLinks: newDeltaLinks,
      teamIds: cursor.teamIds,
      channelMeta: newChannelMeta,
      lastFullSync: cursor.lastFullSync,
    },
    hasMore: false,
    stats: { processed, skipped, errors },
  };
}
