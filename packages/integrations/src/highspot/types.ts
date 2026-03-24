import { z } from "zod";

export const HighspotTokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
  token_type: z.string(),
  scope: z.string().optional(),
});

export type HighspotTokenResponse = z.infer<typeof HighspotTokenResponseSchema>;

export const HighspotUserInfoSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  organization: z
    .object({
      id: z.string(),
      name: z.string().optional(),
      domain: z.string().optional(),
    })
    .optional(),
});

export type HighspotUserInfo = z.infer<typeof HighspotUserInfoSchema>;

export type HighspotOAuthResult = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  userId: string;
  userEmail: string;
  userName: string;
  orgId: string;
  orgName?: string;
  domain: string;
};
