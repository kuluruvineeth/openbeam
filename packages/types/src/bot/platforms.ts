import { z } from "zod";

export const BotPlatformSchema = z.enum([
  "SLACK",
  "TEAMS",
  "DISCORD",
  "TELEGRAM",
  "WHATSAPP",
]);
export type BotPlatform = z.infer<typeof BotPlatformSchema>;

export const BOT_PLATFORMS = BotPlatformSchema.options;

export const PlatformConfigSchema = z.object({
  platform: BotPlatformSchema,
  webhookPath: z.string(),
  maxMessageLength: z.number().int().positive(),
  supportsThreads: z.boolean(),
  supportsRichFormatting: z.boolean(),
  supportsButtons: z.boolean(),
  supportsFiles: z.boolean(),
});
export type PlatformConfig = z.infer<typeof PlatformConfigSchema>;

export const PLATFORM_CONFIGS: Record<BotPlatform, PlatformConfig> = {
  SLACK: {
    platform: "SLACK",
    webhookPath: "/webhooks/slack",
    maxMessageLength: 40_000,
    supportsThreads: true,
    supportsRichFormatting: true,
    supportsButtons: true,
    supportsFiles: true,
  },
  TEAMS: {
    platform: "TEAMS",
    webhookPath: "/webhooks/teams",
    maxMessageLength: 28_000,
    supportsThreads: true,
    supportsRichFormatting: true,
    supportsButtons: true,
    supportsFiles: true,
  },
  DISCORD: {
    platform: "DISCORD",
    webhookPath: "/webhooks/discord",
    maxMessageLength: 4096,
    supportsThreads: true,
    supportsRichFormatting: true,
    supportsButtons: true,
    supportsFiles: true,
  },
  TELEGRAM: {
    platform: "TELEGRAM",
    webhookPath: "/webhooks/telegram",
    maxMessageLength: 4096,
    supportsThreads: false,
    supportsRichFormatting: true,
    supportsButtons: true,
    supportsFiles: true,
  },
  WHATSAPP: {
    platform: "WHATSAPP",
    webhookPath: "/webhooks/whatsapp",
    maxMessageLength: 4096,
    supportsThreads: false,
    supportsRichFormatting: true,
    supportsButtons: true,
    supportsFiles: true,
  },
};
