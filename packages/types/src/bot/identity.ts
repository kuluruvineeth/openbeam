import { z } from "zod";
import { BotPlatformSchema } from "./platforms";

export const BotUserLinkSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  userId: z.string(),
  platform: BotPlatformSchema,
  platformUserId: z.string(),
  platformTeamId: z.string(),
  platformUsername: z.string().optional(),
  linkedAt: z.date(),
  lastActiveAt: z.date(),
});
export type BotUserLink = z.infer<typeof BotUserLinkSchema>;

export const BotInstallationSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  platform: BotPlatformSchema,
  platformTeamId: z.string(),
  platformTeamName: z.string().optional(),
  installedBy: z.string(),
  botToken: z.string(),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  tokenExpiresAt: z.date().optional(),
  scopes: z.array(z.string()),
  webhookUrl: z.string().optional(),
  active: z.boolean(),
  installedAt: z.date(),
  updatedAt: z.date(),
});
export type BotInstallation = z.infer<typeof BotInstallationSchema>;

export const CreateLinkRequestInputSchema = z.object({
  platform: BotPlatformSchema,
  platformUserId: z.string(),
  platformTeamId: z.string(),
  token: z.string(),
  expiresAt: z.date(),
});
export type CreateLinkRequestInput = z.infer<
  typeof CreateLinkRequestInputSchema
>;

export const BotLinkRequestSchema = z.object({
  id: z.string(),
  platform: BotPlatformSchema,
  platformUserId: z.string(),
  platformTeamId: z.string(),
  token: z.string(),
  teamId: z.string().optional(),
  userId: z.string().optional(),
  expiresAt: z.date(),
  consumed: z.boolean(),
  createdAt: z.date(),
});
export type BotLinkRequest = z.infer<typeof BotLinkRequestSchema>;
