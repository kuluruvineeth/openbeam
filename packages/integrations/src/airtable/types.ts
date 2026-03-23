import { z } from "zod";

export const AirtableTokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
  token_type: z.string(),
  scope: z.string().optional(),
  refresh_expires_in: z.number().optional(),
});

export type AirtableTokenResponse = z.infer<typeof AirtableTokenResponseSchema>;

export const AirtableUserInfoSchema = z.object({
  id: z.string(),
  email: z.string().optional(),
  state: z.string().optional(),
});

export type AirtableUserInfo = z.infer<typeof AirtableUserInfoSchema>;

export type AirtableOAuthResult = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  userId: string;
  userEmail?: string;
};
