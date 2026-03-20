import { z } from "zod";

export const MicrosoftTokenResponseSchema = z.object({
  access_token: z.string(),
  expires_in: z.number(),
  refresh_token: z.string().optional(),
  scope: z.string().optional(),
  token_type: z.string(),
});

export type MicrosoftTokenResponse = z.infer<
  typeof MicrosoftTokenResponseSchema
>;

export const MicrosoftUserInfoSchema = z.object({
  id: z.string(),
  displayName: z.string().optional(),
  mail: z.string().nullable().optional(),
  userPrincipalName: z.string(),
});

export type MicrosoftUserInfo = z.infer<typeof MicrosoftUserInfoSchema>;

export type MicrosoftOAuthResult = {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  scopes: string[];
  userEmail: string;
  userId: string;
  displayName?: string;
};
