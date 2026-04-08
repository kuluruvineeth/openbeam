import { z } from "zod";

const EnvSchema = z
  .object({
    BOT_PORT: z.coerce.number().default(3005),
    DATABASE_URL: z.string(),
    REDIS_URL: z.string().default("redis://localhost:6379"),
    ANTHROPIC_API_KEY: z.string().optional(),
    OPENAI_API_KEY: z.string().optional(),
    SLACK_BOT_TOKEN: z.string().optional(),
    SLACK_SIGNING_SECRET: z.string().optional(),
    SLACK_APP_ID: z.string().optional(),
    TEAMS_APP_ID: z.string().optional(),
    TEAMS_APP_PASSWORD: z.string().optional(),
    DISCORD_APPLICATION_ID: z.string().optional(),
    DISCORD_PUBLIC_KEY: z.string().optional(),
    DISCORD_BOT_TOKEN: z.string().optional(),
    TELEGRAM_BOT_TOKEN: z.string().optional(),
    TELEGRAM_WEBHOOK_SECRET: z.string().optional(),
    WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
    WHATSAPP_ACCESS_TOKEN: z.string().optional(),
    WHATSAPP_VERIFY_TOKEN: z.string().optional(),
    WHATSAPP_APP_SECRET: z.string().optional(),
    BOT_LINK_BASE_URL: z
      .string()
      .url()
      .startsWith("https://")
      .default("https://app.openbeam.work"),
  })
  .refine((e) => !e.SLACK_BOT_TOKEN || e.SLACK_SIGNING_SECRET, {
    message: "SLACK_SIGNING_SECRET required when SLACK_BOT_TOKEN is set",
  })
  .refine((e) => !e.TEAMS_APP_ID || e.TEAMS_APP_PASSWORD, {
    message: "TEAMS_APP_PASSWORD required when TEAMS_APP_ID is set",
  })
  .refine(
    (e) =>
      !e.DISCORD_APPLICATION_ID ||
      (e.DISCORD_PUBLIC_KEY && e.DISCORD_BOT_TOKEN),
    {
      message:
        "DISCORD_PUBLIC_KEY and DISCORD_BOT_TOKEN required when DISCORD_APPLICATION_ID is set",
    }
  )
  .refine((e) => !e.TELEGRAM_BOT_TOKEN || e.TELEGRAM_WEBHOOK_SECRET, {
    message: "TELEGRAM_WEBHOOK_SECRET required when TELEGRAM_BOT_TOKEN is set",
  })
  .refine(
    (e) =>
      !e.WHATSAPP_PHONE_NUMBER_ID ||
      (e.WHATSAPP_ACCESS_TOKEN && e.WHATSAPP_APP_SECRET),
    {
      message:
        "WHATSAPP_ACCESS_TOKEN and WHATSAPP_APP_SECRET required when WHATSAPP_PHONE_NUMBER_ID is set",
    }
  );

export type Env = z.infer<typeof EnvSchema>;

export const env = EnvSchema.parse(process.env);
