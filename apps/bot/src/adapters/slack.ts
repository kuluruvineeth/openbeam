import type {
  AppMentionEvent,
  MessageEvent,
  SlackClient,
} from "@openbeam/services";
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
import { env } from "../env";
import { renderSlack } from "../renderers/slack";

function tsToDate(ts: string | undefined): Date {
  return new Date(Number.parseFloat(ts ?? "0") * 1000);
}

function mentionToMessage(
  event: AppMentionEvent,
  teamId: string
): UnifiedMessage {
  return {
    id: event.ts,
    platform: "SLACK",
    platformUserId: event.user,
    platformTeamId: teamId,
    channelId: event.channel,
    threadId: event.thread_ts,
    text: event.text,
    isDirectMessage: false,
    isMention: true,
    timestamp: tsToDate(event.ts),
    rawEvent: event,
  };
}

function messageToUnified(event: MessageEvent, teamId: string): UnifiedMessage {
  return {
    id: event.ts,
    platform: "SLACK",
    platformUserId: event.user ?? "",
    platformTeamId: teamId,
    channelId: event.channel,
    threadId: event.thread_ts,
    text: event.text ?? "",
    isDirectMessage: false,
    isMention: false,
    timestamp: tsToDate(event.ts),
    rawEvent: event,
  };
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

  parseEvent(
    rawBody: unknown,
    _headers: Record<string, string>
  ): Promise<UnifiedMessage | null> {
    const result = parseSlackEvent(rawBody);
    if (!(result.success && result.event)) {
      return Promise.resolve(null);
    }

    const { envelope, event } = result;
    const teamId = envelope.team_id ?? "";

    if (event.type === "app_mention") {
      return Promise.resolve(
        mentionToMessage(event as AppMentionEvent, teamId)
      );
    }

    if (event.type === "message") {
      const msg = event as MessageEvent;
      if (msg.subtype) {
        return Promise.resolve(null);
      }
      return Promise.resolve(messageToUnified(msg, teamId));
    }

    return Promise.resolve(null);
  }

  async sendResponse(
    message: UnifiedMessage,
    response: BotResponse
  ): Promise<void> {
    const client = this.createClient();
    if (!client) {
      return;
    }

    const payload = renderSlack(response);

    await client.call("chat.postMessage", {
      channel: message.channelId,
      text: payload.text,
      blocks: payload.blocks,
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
