import { z } from "zod";

export const LucidTokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
  token_type: z.string(),
  scope: z.string(),
});

export type LucidTokenResponse = z.infer<typeof LucidTokenResponseSchema>;

export const LucidUserInfoSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  accountId: z.string().optional(),
});

export type LucidUserInfo = z.infer<typeof LucidUserInfoSchema>;

export type LucidOAuthResult = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  userId: string;
  userEmail: string;
  userName: string;
  accountId: string;
};
