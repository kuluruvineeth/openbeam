import { z } from "zod";

export const PanoptoTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
  refresh_token: z.string(),
  scope: z.string().optional(),
});

export type PanoptoTokenResponse = z.infer<typeof PanoptoTokenResponseSchema>;

export const PanoptoUserInfoSchema = z.object({
  UserId: z.string(),
  FirstName: z.string(),
  LastName: z.string(),
  Email: z.string(),
  SystemRole: z.string().optional(),
});

export type PanoptoUserInfo = z.infer<typeof PanoptoUserInfoSchema>;

export type PanoptoOAuthResult = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  userId: string;
  userEmail: string;
  displayName: string;
  instanceUrl: string;
};
