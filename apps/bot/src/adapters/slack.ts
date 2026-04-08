import type { SlackClient } from "@openbeam/services";
import {
  createSlackClient,
  parseSlackEvent,
  verifySlackSignature,
} from "@openbeam/services";
import type {
  BotResponse,
  PlatformAdapter,
  PlatformConfig,
  UnifiedMessage,
} from "@openbeam/types/bot";
import { PLATFORM_CONFIGS } from "@openbeam/types/bot";
import { formatForPlatform } from "../ai/formatter";
import { env } from "../env";

function tsToDate(ts: string | undefined): Date {
  return new Date(Number.parseFloat(ts ?? "0") * 1000);
}

export class SlackAdapter implements PlatformAdapter {
  readonly platform = "SLACK" as const;
  readonly config: PlatformConfig = PLATFORM_CONFIGS.SLACK;

  verifySignature(rawBody: string, headers: Record<string, string>): boolean {
    const secret = env.SLACK_SIGNING_SECRET;
    if (!secret) {
      return false;
    }
    const result = verifySlackSignature(
      {
        body: rawBody,
        signature: headers["x-slack-signature"] ?? "",
        timestamp: headers["x-slack-request-timestamp"] ?? "",
      },
      secret
    );
    return result.valid;
  }

  async parseEvent(
    rawBody: unknown,
    _headers: Record<string, string>
  ): Promise<UnifiedMessage | null> {
    const result = await Promise.resolve(parseSlackEvent(rawBody));
    if (!(result.success && result.event)) {
      return null;
    }

    const { envelope, event } = result;

    if (event.type === "app_mention") {
      const mention = event as {
        user: string;
        text: string;
        ts: string;
        channel: string;
        thread_ts?: string;
      };
      return {
        id: mention.ts,
        platform: "SLACK",
        platformUserId: mention.user,
        platformTeamId: envelope.team_id ?? "",
        channelId: mention.channel,
        threadId: mention.thread_ts,
        text: mention.text,
        isDirectMessage: false,
        isMention: true,
        timestamp: tsToDate(mention.ts),
        rawEvent: event,
      };
    }

    if (event.type === "message") {
      const msg = event as Record<string, unknown>;
      if (msg.subtype) {
        return null;
      }
      const isDM = msg.channel_type === "im";
      return {
        id: String(msg.ts ?? ""),
        platform: "SLACK",
        platformUserId: String(msg.user ?? ""),
        platformTeamId: envelope.team_id ?? "",
        channelId: String(msg.channel ?? ""),
        threadId: msg.thread_ts ? String(msg.thread_ts) : undefined,
        text: String(msg.text ?? ""),
        isDirectMessage: isDM,
        isMention: false,
        timestamp: tsToDate(String(msg.ts ?? "0")),
        rawEvent: event,
      };
    }

    return null;
  }

  async sendResponse(
    message: UnifiedMessage,
    response: BotResponse
  ): Promise<void> {
    const client = this.createClient();
    if (!client) {
      return;
    }

    const text = formatForPlatform("SLACK", response);

    await client.call("chat.postMessage", {
      channel: message.channelId,
      text,
      thread_ts: message.threadId,
    });
  }

  sendTypingIndicator(_channelId: string, _threadId?: string): Promise<void> {
    return Promise.resolve();
  }

  private createClient(): SlackClient | null {
    const token = env.SLACK_BOT_TOKEN;
    if (!token) {
      return null;
    }
    return createSlackClient({
      token,
      connectorId: `bot_slack_${env.SLACK_APP_ID ?? "default"}`,
    });
  }
}
