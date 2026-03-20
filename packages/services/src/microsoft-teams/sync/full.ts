import type {
  TeamsSyncBatch,
  TeamsTransformContext,
} from "@openbeam/types/services/connectors/teams";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import type { MicrosoftGraphClient } from "../../microsoft/client";
import { transformTeamsMessage } from "../transformers/message";

type TeamsTeam = {
  id: string;
  displayName: string;
  description?: string;
};

type TeamsChannel = {
  id: string;
  displayName: string;
  description?: string;
  membershipType?: string;
};

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

export async function* teamsFullSync(
  client: MicrosoftGraphClient,
  context: TeamsTransformContext,
  options: { batchSize?: number } = {}
): AsyncGenerator<TeamsSyncBatch<GenericDocument>, void, undefined> {
  const batchSize = options.batchSize ?? 100;
  let documents: GenericDocument[] = [];
  let processed = 0;
  let skipped = 0;
  let errors = 0;
  const channelDeltaLinks: Record<string, string> = {};
  const teamIds: string[] = [];
  const channelMeta: Record<string, { teamName: string; channelName: string }> =
    {};

  const teams: TeamsTeam[] = [];
  for await (const page of client.paginate<TeamsTeam>("/me/joinedTeams")) {
    teams.push(...page);
  }

  for (const team of teams) {
    teamIds.push(team.id);

    let channels: TeamsChannel[] = [];
    try {
      const channelResponse = await client.get<{ value: TeamsChannel[] }>(
        `/teams/${team.id}/channels`
      );
      channels = channelResponse.value;
    } catch (error) {
      logger.error(
        { error, teamId: team.id },
        "Failed to fetch channels for team"
      );
      errors += 1;
      continue;
    }

    for (const channel of channels) {
      const metaKey = `${team.id}:${channel.id}`;
      channelMeta[metaKey] = {
        teamName: team.displayName,
        channelName: channel.displayName,
      };

      try {
        for await (const page of client.deltaPages<TeamsMessage>(
          `/teams/${team.id}/channels/${channel.id}/messages/delta`
        )) {
          if (page.deltaLink) {
            channelDeltaLinks[metaKey] = page.deltaLink;
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
                teamName: team.displayName,
                channelName: channel.displayName,
                teamId: team.id,
                channelId: channel.id,
              });
              documents.push(doc);
              processed += 1;

              try {
                const repliesResponse = await client.get<{
                  value: TeamsMessage[];
                }>(
                  `/teams/${team.id}/channels/${channel.id}/messages/${message.id}/replies`
                );
                for (const reply of repliesResponse.value) {
                  if (reply.messageType !== "message") {
                    skipped += 1;
                    continue;
                  }
                  const replyDoc = transformTeamsMessage(reply, context, {
                    teamName: team.displayName,
                    channelName: channel.displayName,
                    teamId: team.id,
                    channelId: channel.id,
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
                    channelDeltaLinks: { ...channelDeltaLinks },
                    teamIds: [...teamIds],
                    channelMeta: { ...channelMeta },
                    lastFullSync: Date.now(),
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
        logger.error(
          { error, channelId: channel.id, teamId: team.id },
          "Failed to fetch messages for channel"
        );
        errors += 1;
      }
    }
  }

  yield {
    items: documents,
    cursor: {
      channelDeltaLinks,
      teamIds,
      channelMeta,
      lastFullSync: Date.now(),
    },
    hasMore: false,
    stats: { processed, skipped, errors },
  };
}
