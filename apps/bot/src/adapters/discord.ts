import type {
  BotResponse,
  PlatformAdapter,
  PlatformConfig,
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

function verifySignature(
  rawBody: string,
  signature: string,
  timestamp: string,
  publicKey: string
): Promise<boolean> {
  return Promise.resolve(verifyKey(rawBody, signature, timestamp, publicKey));
}

async function postCallback(
  interactionId: string,
  token: string,
  body: Record<string, unknown>
): Promise<void> {
  await fetch(
    `https://discord.com/api/v10/interactions/${interactionId}/${token}/callback`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

export class DiscordAdapter implements PlatformAdapter {
  readonly platform = "DISCORD" as const;
  readonly config: PlatformConfig = PLATFORM_CONFIGS.DISCORD;

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
      verifySignature(_rawBody, signature, timestamp, publicKey)
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
    if (!rawEvent.success) {
      return;
    }

    const { id, token } = rawEvent.data;
    const payload = renderDiscord(response) as unknown as Record<
      string,
      unknown
    >;
    await postCallback(id, token, payload);
  }

  sendTypingIndicator(_channelId: string, _threadId?: string): Promise<void> {
    return Promise.resolve();
  }
}
