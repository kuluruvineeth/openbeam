import type { Connector, OAuthProvider } from "@openplane/db";
import { rateLimiter } from "@openplane/redis";
import type { GenericDocument } from "@openplane/vespa";
import { WebClient } from "@slack/web-api";
import logger from "../../utils/logger";
import {
  BaseConnector,
  type FetchResult,
  type SyncResult,
} from "../base-connector";

interface SlackFile {
  id: string;
  name: string;
  mimetype: string;
  url_private: string;
}

interface SlackBlock {
  type: string;
  [key: string]: unknown;
}

interface SlackMessage {
  ts: string;
  text?: string;
  user?: string;
  thread_ts?: string;
  reply_count?: number;
  reactions?: Array<{ name: string; count: number; users: string[] }>;
  files?: SlackFile[];
  blocks?: SlackBlock[];
  edited?: { ts: string; user: string };
}

interface SlackChannel {
  id: string;
  name: string;
  is_private: boolean;
  is_member: boolean;
  members?: string[];
}

/**
 * Slack Connector Implementation
 * Fetches messages, channels, and user data from Slack
 */
export class SlackConnector extends BaseConnector {
  private readonly client: WebClient;
  private readonly rateLimitKey: string;
  private readonly channelMembersCache = new Map<string, string[]>();

  constructor(connector: Connector & { oauthProvider?: OAuthProvider | null }) {
    super(connector);

    // Get OAuth token from connector
    const credentials = this.getCredentials();
    const token = credentials.accessToken as string | undefined;

    if (!token) {
      throw new Error("Slack access token not found in connector credentials");
    }

    this.client = new WebClient(token);
    this.rateLimitKey = `slack:${this.connector.id}`;
  }

  /**
   * Main sync method
   */
  async sync(cursor?: string): Promise<SyncResult> {
    try {
      logger.info({ connectorId: this.connector.id }, "Starting Slack sync");

      const result = await this.fetchDocuments(cursor);

      logger.info(
        {
          connectorId: this.connector.id,
          documentsCount: result.documents.length,
          hasMore: result.hasMore,
        },
        "Slack sync completed"
      );

      return {
        documents: result.documents,
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
      };
    } catch (error) {
      logger.error(
        { error, connectorId: this.connector.id },
        "Slack sync failed"
      );
      throw error;
    }
  }

  /**
   * Fetch documents (messages) from Slack
   */
  async fetchDocuments(cursor?: string): Promise<FetchResult> {
    const documents: GenericDocument[] = [];
    const sinceTimestamp = cursor ? Number(cursor) : undefined;

    const channels = await this.getChannels();
    logger.info({ channelCount: channels.length }, "Fetched Slack channels");

    const accessibleChannels = this.getAccessibleChannels(channels);
    logger.info(
      { accessibleChannelCount: accessibleChannels.length },
      "Channels accessible for message fetching"
    );

    const memberMap = await this.buildChannelMemberMap(accessibleChannels);
    let latestSlackTimestamp = cursor;

    for (const channel of accessibleChannels) {
      const channelResult = await this.collectChannelDocuments(
        channel,
        memberMap.get(channel.id),
        sinceTimestamp
      );
      documents.push(...channelResult.documents);
      if (
        channelResult.latestSlackTimestamp &&
        (!latestSlackTimestamp ||
          Number(channelResult.latestSlackTimestamp) >
            Number(latestSlackTimestamp))
      ) {
        latestSlackTimestamp = channelResult.latestSlackTimestamp;
      }
    }

    return {
      documents,
      nextCursor: latestSlackTimestamp ?? cursor,
      hasMore: false,
    };
  }

  /**
   * Get channels that the bot can access (only channels where bot is already a member)
   */
  private getAccessibleChannels(channels: SlackChannel[]): SlackChannel[] {
    const accessibleChannels = channels.filter((channel) => {
      if (channel.is_member) {
        return true;
      }

      logger.debug(
        {
          channelId: channel.id,
          channelName: channel.name,
          isPrivate: channel.is_private,
        },
        "Skipping channel (bot not a member). Add bot manually to index this channel."
      );
      return false;
    });

    return accessibleChannels;
  }

  private toTimestampMs(ts: string): number {
    return Math.floor(Number.parseFloat(ts) * 1000);
  }

  private async buildChannelMemberMap(
    channels: SlackChannel[]
  ): Promise<Map<string, string[]>> {
    const map = new Map<string, string[]>();

    for (const channel of channels) {
      if (!channel.is_private) {
        continue;
      }

      const members = await this.getChannelMembers(channel.id);
      map.set(channel.id, members);
    }

    return map;
  }

  private async collectChannelDocuments(
    channel: SlackChannel,
    channelMembers: string[] | undefined,
    sinceTimestamp?: number
  ): Promise<{ documents: GenericDocument[]; latestSlackTimestamp?: string }> {
    const documents: GenericDocument[] = [];
    let latestSlackTimestamp: string | undefined;

    const messages = await this.fetchChannelMessages(channel.id, {
      sinceTimestamp,
    });

    for (const message of messages) {
      const doc = this.transformToGenericDocument({
        message,
        channel,
        channelMembers,
      });
      documents.push(doc);
      if (
        !latestSlackTimestamp ||
        Number(message.ts) > Number(latestSlackTimestamp)
      ) {
        latestSlackTimestamp = message.ts;
      }

      if (
        message.thread_ts &&
        message.reply_count &&
        message.reply_count > 0 &&
        message.thread_ts === message.ts
      ) {
        const replies = await this.fetchThreadReplies(
          channel.id,
          message.thread_ts,
          sinceTimestamp
        );

        for (const reply of replies) {
          const replyDoc = this.transformToGenericDocument({
            message: reply,
            channel,
            channelMembers,
          });
          documents.push(replyDoc);
          if (
            !latestSlackTimestamp ||
            Number(reply.ts) > Number(latestSlackTimestamp)
          ) {
            latestSlackTimestamp = reply.ts;
          }
        }
      }
    }

    return { documents, latestSlackTimestamp };
  }

  /**
   * Transform Slack message to GenericDocument
   */
  transformToGenericDocument(rawDoc: {
    message: SlackMessage;
    channel: SlackChannel;
    channelMembers?: string[];
  }): GenericDocument {
    const { message, channel } = rawDoc;
    const metadata = this.getMetadata();
    const createdAt = this.toTimestampMs(message.ts);
    const updatedAt = message.edited
      ? this.toTimestampMs(message.edited.ts)
      : createdAt;

    return {
      id: `${metadata.connectorId}_${channel.id}_${message.ts}`,
      connector_id: metadata.connectorId,
      connector_type: metadata.connectorType,
      organization_id: metadata.organizationId,
      workspace_id: metadata.workspaceId,
      external_id: message.ts,
      document_type: "message",
      title: `Message in #${channel.name}`,
      content: message.text || "",
      author_id: message.user,
      created_at: createdAt,
      updated_at: updatedAt,
      source_id: channel.id,
      source_name: channel.name,
      source_type: "channel",
      parent_id:
        message.thread_ts !== message.ts ? message.thread_ts : undefined,
      thread_id: message.thread_ts || message.ts,
      reaction_count:
        message.reactions?.reduce((sum, r) => sum + r.count, 0) || 0,
      reply_count: message.reply_count || 0,
      metadata: {
        reactions: message.reactions,
        files: message.files,
        blocks: message.blocks,
      },
      url: `https://slack.com/archives/${channel.id}/p${message.ts.replace(".", "")}`,
      is_public: !channel.is_private,
      access_control: channel.is_private
        ? (rawDoc.channelMembers ?? [])
        : undefined,
    };
  }

  /**
   * Validate Slack connection
   */
  async validateConnection(): Promise<boolean> {
    try {
      const authTest = await this.client.auth.test();
      return authTest.ok === true;
    } catch (error) {
      logger.error({ error }, "Slack connection validation failed");
      return false;
    }
  }

  /**
   * Get all accessible channels
   */
  private async getChannels(): Promise<SlackChannel[]> {
    const channels: SlackChannel[] = [];
    let cursor: string | undefined;

    try {
      do {
        const result = await this.client.conversations.list({
          types: "public_channel,private_channel",
          exclude_archived: true,
          limit: 1000,
          cursor,
        });

        channels.push(
          ...(((result.channels as SlackChannel[]) || []) as SlackChannel[])
        );
        cursor = result.response_metadata?.next_cursor || undefined;
      } while (cursor);

      return channels;
    } catch (error) {
      logger.error({ error }, "Failed to fetch Slack channels");
      throw error;
    }
  }

  private async getChannelMembers(channelId: string): Promise<string[]> {
    if (this.channelMembersCache.has(channelId)) {
      return this.channelMembersCache.get(channelId) as string[];
    }

    const members: string[] = [];
    let cursor: string | undefined;

    try {
      do {
        await this.checkRateLimit("conversations.members");
        const response = await this.client.conversations.members({
          channel: channelId,
          cursor,
          limit: 200,
        });

        if (!response.ok) {
          break;
        }

        members.push(...((response.members || []) as string[]));
        cursor = response.response_metadata?.next_cursor || undefined;
      } while (cursor);
    } catch (error) {
      logger.error(
        { error, channelId },
        "Failed to fetch channel members for access control"
      );
    }

    this.channelMembersCache.set(channelId, members);
    return members;
  }

  private async getHistoryPage(
    channelId: string,
    cursor?: string
  ): Promise<
    | { ok: true; messages: SlackMessage[]; nextCursor?: string }
    | { ok: false; error?: string }
  > {
    await this.checkRateLimit("conversations.history");
    const result = await this.client.conversations.history({
      channel: channelId,
      limit: 200,
      cursor,
    });

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    return {
      ok: true,
      messages: (result.messages || []) as SlackMessage[],
      nextCursor: result.response_metadata?.next_cursor || undefined,
    };
  }

  private applyHistoryBatch(
    batch: SlackMessage[],
    sinceTimestamp: number | undefined,
    accumulator: SlackMessage[]
  ): boolean {
    for (const message of batch) {
      const timestamp = Number(message.ts);
      if (sinceTimestamp !== undefined && timestamp <= sinceTimestamp) {
        return true;
      }

      accumulator.push(message);
    }

    return false;
  }

  /**
   * Fetch messages from a specific channel
   */
  private async fetchChannelMessages(
    channelId: string,
    options: { sinceTimestamp?: number } = {}
  ): Promise<SlackMessage[]> {
    const messages: SlackMessage[] = [];
    let cursor: string | undefined;

    try {
      while (true) {
        const page = await this.getHistoryPage(channelId, cursor);

        if (!page.ok) {
          logger.warn(
            { channelId, error: page.error },
            "Slack API returned error for conversations.history"
          );
          break;
        }

        const reachedOlderMessages = this.applyHistoryBatch(
          page.messages,
          options.sinceTimestamp,
          messages
        );

        if (reachedOlderMessages || !page.nextCursor) {
          break;
        }

        cursor = page.nextCursor;
      }
    } catch (error) {
      const slackError = error as { data?: { error?: string } };
      if (slackError?.data?.error === "not_in_channel") {
        logger.warn(
          { channelId },
          "Bot is not a member of channel, skipping (this should not happen after filtering)"
        );
      } else {
        logger.error({ error, channelId }, "Failed to fetch channel messages");
      }
    }

    return messages;
  }

  /**
   * Fetch thread replies
   */
  private async fetchThreadReplies(
    channelId: string,
    threadTs: string,
    sinceTimestamp?: number
  ): Promise<SlackMessage[]> {
    const replies: SlackMessage[] = [];
    let cursor: string | undefined;

    try {
      while (true) {
        await this.checkRateLimit("conversations.replies");
        const result = await this.client.conversations.replies({
          channel: channelId,
          ts: threadTs,
          limit: 200,
          cursor,
        });

        const messages = (result.messages || []) as SlackMessage[];
        const threadReplies = messages.slice(1); // skip parent

        for (const message of threadReplies) {
          const timestamp = Number(message.ts);
          if (sinceTimestamp !== undefined && timestamp <= sinceTimestamp) {
            return replies;
          }
          replies.push(message);
        }

        cursor = result.response_metadata?.next_cursor || undefined;
        if (!cursor) {
          break;
        }
      }
    } catch (error) {
      logger.error(
        { error, channelId, threadTs },
        "Failed to fetch thread replies"
      );
    }

    return replies;
  }

  /**
   * Check rate limit before making API call
   */
  private async checkRateLimit(method: string): Promise<void> {
    const key = `${this.rateLimitKey}:${method}`;
    const allowed = await rateLimiter.checkLimit(key, 50, 60); // 50 requests per 60 seconds

    if (!allowed) {
      logger.warn({ method, key }, "Rate limit hit, waiting...");
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second
      return this.checkRateLimit(method); // Retry
    }
  }
}
