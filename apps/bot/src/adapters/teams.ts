import type { TeamsBotClient } from "@openbeam/services";
import { createTeamsBotClient } from "@openbeam/services";
import type {
  BotResponse,
  PlatformAdapter,
  PlatformConfig,
  ProactiveTarget,
  UnifiedMessage,
} from "@openbeam/types/bot";
import { PLATFORM_CONFIGS } from "@openbeam/types/bot";
import type {
  Request as BotFrameworkRequest,
  Response as BotFrameworkResponse,
} from "botbuilder";
import {
  CloudAdapter,
  ConfigurationBotFrameworkAuthentication,
  type TurnContext,
} from "botbuilder";
import { env } from "../env";
import { renderTeams } from "../renderers/teams";

interface TeamsActivity {
  type: string;
  id: string;
  text: string | undefined;
  timestamp: string | undefined;
  channelData: Record<string, unknown> | undefined;
  conversation: { id: string; isGroup?: boolean } | undefined;
  from: { id: string; name?: string } | undefined;
  recipient: { id: string } | undefined;
  entities: Array<{ type: string }> | undefined;
}

interface TeamsRawEvent {
  _turnContext: TurnContext | null;
  activity: TeamsActivity;
}

function buildBotRequest(
  rawBody: string,
  headers: Record<string, string>
): BotFrameworkRequest {
  return {
    body: JSON.parse(rawBody) as Record<string, unknown>,
    headers,
    method: "POST",
  };
}

function buildBotResponse(): BotFrameworkResponse & {
  resolve: () => void;
  promise: Promise<void>;
} {
  let resolve!: () => void;
  const promise = new Promise<void>((res) => {
    resolve = res;
  });

  return {
    socket: null,
    end(..._args: unknown[]): unknown {
      resolve();
      return;
    },
    header(_name: string, _value: unknown): unknown {
      return;
    },
    send(..._args: unknown[]): unknown {
      resolve();
      return;
    },
    status(_code: number): unknown {
      return;
    },
    resolve,
    promise,
  };
}

function activityToMessage(activity: TeamsActivity): UnifiedMessage | null {
  if (activity.type !== "message") {
    return null;
  }

  const text = activity.text ?? "";
  const conversationId = activity.conversation?.id ?? "";
  const isGroup = activity.conversation?.isGroup === true;
  const recipientId = activity.recipient?.id ?? "";

  const isMention =
    activity.entities?.some(
      (e) => e.type === "mention" && text.includes(recipientId)
    ) ?? false;

  return {
    id: activity.id,
    platform: "TEAMS",
    platformUserId: activity.from?.id ?? "",
    platformTeamId: activity.channelData?.tenantId
      ? String(activity.channelData.tenantId)
      : "",
    channelId: conversationId,
    threadId: undefined,
    text: text.replace(/<at>[^<]*<\/at>/g, "").trim(),
    isDirectMessage: !isGroup,
    isMention,
    timestamp: activity.timestamp ? new Date(activity.timestamp) : new Date(),
    rawEvent: { _turnContext: null, activity } satisfies TeamsRawEvent,
  };
}

function buildBotClient(): TeamsBotClient | null {
  const appId = env.TEAMS_APP_ID;
  const appPassword = env.TEAMS_APP_PASSWORD;
  if (!(appId && appPassword)) {
    return null;
  }
  return createTeamsBotClient({
    appId,
    appPassword,
    connectorId: `bot_teams_${appId}`,
  });
}

function buildAdapter(): CloudAdapter {
  const auth = new ConfigurationBotFrameworkAuthentication({
    MicrosoftAppId: env.TEAMS_APP_ID ?? "",
    MicrosoftAppPassword: env.TEAMS_APP_PASSWORD ?? "",
  });
  return new CloudAdapter(auth);
}

export class TeamsAdapter implements PlatformAdapter {
  readonly platform = "TEAMS" as const;
  readonly config: PlatformConfig = PLATFORM_CONFIGS.TEAMS;

  private readonly cloudAdapter = buildAdapter();
  private readonly botClient = buildBotClient();

  verifySignature(
    _rawBody: string,
    _headers: Record<string, string>
  ): Promise<boolean> {
    return Promise.resolve(true);
  }

  parseEvent(
    _rawBody: unknown,
    _headers: Record<string, string>
  ): Promise<UnifiedMessage | null> {
    return Promise.resolve(null);
  }

  async processActivity(
    rawBody: string,
    headers: Record<string, string>,
    onMessage: (message: UnifiedMessage) => Promise<void>
  ): Promise<void> {
    const req = buildBotRequest(rawBody, headers);
    const res = buildBotResponse();

    await this.cloudAdapter.process(
      req,
      res as BotFrameworkResponse,
      async (context: TurnContext) => {
        const activity = context.activity as unknown as TeamsActivity;
        const message = activityToMessage(activity);
        if (!message) {
          return;
        }

        const raw = message.rawEvent as TeamsRawEvent;
        raw._turnContext = context;

        await onMessage(message);
      }
    );

    await res.promise;
  }

  async sendResponse(
    message: UnifiedMessage,
    response: BotResponse
  ): Promise<void> {
    const raw = message.rawEvent as TeamsRawEvent | null;
    if (!raw?._turnContext) {
      return;
    }

    const payload = renderTeams(response);
    await raw._turnContext.sendActivity(payload);
  }

  async sendProactive(
    target: ProactiveTarget,
    response: BotResponse
  ): Promise<boolean> {
    if (!this.botClient) {
      return false;
    }

    const payload = renderTeams(response);
    return await this.botClient.sendProactiveMessage({
      userId: target.platformUserId,
      tenantId: target.platformTeamId,
      activity: payload as unknown as Record<string, unknown>,
    });
  }

  sendTypingIndicator(_channelId: string, _threadId?: string): Promise<void> {
    return Promise.resolve();
  }
}
