import type { DiscordClient } from "@openbeam/services";
import { createDiscordClient } from "@openbeam/services";
import type {
  BotResponse,
  PlatformAdapter,
  PlatformConfig,
  ProactiveTarget,
  UnifiedMessage,
} from "@openbeam/types/bot";
import { PLATFORM_CONFIGS } from "@openbeam/types/bot";
import {
  InteractionResponseType,
  InteractionType,
} from "discord-api-types/v10";
import { verifyKey } from "discord-interactions";
import { z } from "zod";
import { env } from "../env";
import { renderDiscord } from "../renderers/discord";

export const DISCORD_PING_RESPONSE = { type: InteractionResponseType.Pong };

const DiscordUserSchema = z.object({
  id: z.string(),
  username: z.string(),
});

const DiscordCommandOptionSchema = z.object({
  name: z.string(),
  type: z.number(),
  value: z.union([z.string(), z.number(), z.boolean()]).optional(),
});

const DiscordCommandDataSchema = z.object({
  name: z.string(),
  options: z.array(DiscordCommandOptionSchema).optional(),
});

const DiscordInteractionSchema = z.object({
  id: z.string(),
  token: z.string(),
  type: z.number(),
  guild_id: z.string().optional(),
  channel_id: z.string().optional(),
  user: DiscordUserSchema.optional(),
  member: z
    .object({
      user: DiscordUserSchema,
    })
    .optional(),
  data: DiscordCommandDataSchema.optional(),
});

type DiscordInteraction = z.infer<typeof DiscordInteractionSchema>;

function extractUserId(interaction: DiscordInteraction): string {
  return interaction.user?.id ?? interaction.member?.user?.id ?? "";
}

function extractCommandText(interaction: DiscordInteraction): string {
  const option = interaction.data?.options?.[0];
  if (!option) {
    return "";
  }
  if (option.type === 3 && typeof option.value === "string") {
    return option.value;
  }
  return String(option.value ?? "");
}

function verifySignatureEd25519(
  rawBody: string,
  signature: string,
  timestamp: string,
  publicKey: string
): Promise<boolean> {
  return Promise.resolve(verifyKey(rawBody, signature, timestamp, publicKey));
}

function buildClient(): DiscordClient | null {
  const botToken = env.DISCORD_BOT_TOKEN;
  const applicationId = env.DISCORD_APPLICATION_ID;
  if (!(botToken && applicationId)) {
    return null;
  }
  return createDiscordClient({
    botToken,
    applicationId,
    connectorId: `bot_discord_${applicationId}`,
  });
}

export class DiscordAdapter implements PlatformAdapter {
  readonly platform = "DISCORD" as const;
  readonly config: PlatformConfig = PLATFORM_CONFIGS.DISCORD;
  private readonly client = buildClient();

  verifySignature(
    _rawBody: string,
    headers: Record<string, string>
  ): Promise<boolean> {
    const publicKey = env.DISCORD_PUBLIC_KEY;
    if (!publicKey) {
      return Promise.resolve(false);
    }
    const signature = headers["x-signature-ed25519"] ?? "";
    const timestamp = headers["x-signature-timestamp"] ?? "";
    return Promise.resolve(
      verifySignatureEd25519(_rawBody, signature, timestamp, publicKey)
    );
  }

  parseEvent(
    rawBody: unknown,
    _headers: Record<string, string>
  ): Promise<UnifiedMessage | null> {
    const parsed = DiscordInteractionSchema.safeParse(rawBody);
    if (!parsed.success) {
      return Promise.resolve(null);
    }

    const interaction = parsed.data;

    if (interaction.type !== InteractionType.ApplicationCommand) {
      return Promise.resolve(null);
    }

    const command = interaction.data?.name ?? "";
    const text = extractCommandText(interaction);

    return Promise.resolve({
      id: interaction.id,
      platform: "DISCORD",
      platformUserId: extractUserId(interaction),
      platformTeamId: interaction.guild_id ?? "",
      channelId: interaction.channel_id ?? interaction.guild_id ?? "",
      text,
      command,
      isDirectMessage: !interaction.guild_id,
      isMention: false,
      timestamp: new Date(),
      rawEvent: interaction,
    });
  }

  async sendResponse(
    message: UnifiedMessage,
    response: BotResponse
  ): Promise<void> {
    const rawEvent = DiscordInteractionSchema.safeParse(message.rawEvent);
    if (!(rawEvent.success && this.client)) {
      return;
    }

    const { id, token } = rawEvent.data;
    const payload = renderDiscord(response) as unknown as Record<
      string,
      unknown
    >;
    await this.client.postInteractionCallback(id, token, payload);
  }

  async sendStreamPlaceholder(message: UnifiedMessage): Promise<string | null> {
    const rawEvent = DiscordInteractionSchema.safeParse(message.rawEvent);
    if (!(rawEvent.success && this.client)) {
      return null;
    }

    const { id, token } = rawEvent.data;
    await this.client.postInteractionCallback(id, token, { type: 5 });
    return token;
  }

  async updateStreamMessage(
    _message: UnifiedMessage,
    interactionToken: string,
    text: string
  ): Promise<void> {
    if (!this.client) {
      return;
    }

    const res = await this.client.patchOriginalMessage(interactionToken, {
      content: text,
    });

    if (res.status === 429) {
      const data = (await res.json()) as { retry_after: number };
      await new Promise((r) => setTimeout(r, data.retry_after * 1000));
    }
  }

  async finalizeStreamMessage(
    _message: UnifiedMessage,
    interactionToken: string,
    response: BotResponse
  ): Promise<void> {
    if (!this.client) {
      return;
    }

    const payload = renderDiscord(response);
    await this.client.patchOriginalMessage(interactionToken, payload.data);
  }

  async sendProactive(
    target: ProactiveTarget,
    response: BotResponse
  ): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    const payload = renderDiscord(response);
    return await this.client.sendDm(target.platformUserId, {
      embeds: payload.data.embeds as unknown as Record<string, unknown>[],
      components: payload.data.components as unknown as Record<
        string,
        unknown
      >[],
    });
  }

  sendTypingIndicator(_channelId: string, _threadId?: string): Promise<void> {
    return Promise.resolve();
  }
}
