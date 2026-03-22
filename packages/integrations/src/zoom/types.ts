import { z } from "zod";

export const ZoomTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
  scope: z.string(),
});

export type ZoomTokenResponse = z.infer<typeof ZoomTokenResponseSchema>;

export const ZoomUserInfoSchema = z.object({
  id: z.string(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  display_name: z.string().optional(),
  email: z.string(),
  account_id: z.string().optional(),
  pic_url: z.string().optional(),
});

export type ZoomUserInfo = z.infer<typeof ZoomUserInfoSchema>;

export type ZoomOAuthResult = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  scopes: string[];
  userId: string;
  email: string;
  displayName?: string;
  accountId?: string;
};
