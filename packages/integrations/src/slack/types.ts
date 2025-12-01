import { z } from "zod";

export const SlackOAuthResponseSchema = z.object({
  ok: z.boolean(),
  access_token: z.string().optional(),
  refresh_token: z.string().optional(),
  token_type: z.string().optional(),
  scope: z.string().optional(),
  bot_user_id: z.string().optional(),
  app_id: z.string().optional(),
  team: z
    .object({
      name: z.string(),
      id: z.string(),
    })
    .optional(),
  enterprise: z
    .object({
      name: z.string(),
      id: z.string(),
    })
    .optional()
    .nullable(),
  authed_user: z
    .object({
      id: z.string(),
      scope: z.string().optional(),
      access_token: z.string().optional(),
      token_type: z.string().optional(),
    })
    .optional(),
  error: z.string().optional(),
});

export type SlackOAuthResponse = z.infer<typeof SlackOAuthResponseSchema>;

export const SlackAuthResultSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  scopes: z.array(z.string()),
  teamId: z.string(),
  teamName: z.string(),
  botUserId: z.string(),
  syncAccessToken: z.string().optional(),
  syncScopes: z.array(z.string()).optional(),
  syncAuthedUserId: z.string().optional(),
});

export type SlackAuthResult = z.infer<typeof SlackAuthResultSchema>;
