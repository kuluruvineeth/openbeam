import { z } from "zod";

export const DropboxTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
  refresh_token: z.string().optional(),
  scope: z.string().optional(),
  uid: z.string(),
  account_id: z.string(),
});

export type DropboxTokenResponse = z.infer<typeof DropboxTokenResponseSchema>;

export const DropboxAccountInfoSchema = z.object({
  account_id: z.string(),
  name: z.object({
    display_name: z.string(),
    abbreviated_name: z.string().optional(),
  }),
  email: z.string(),
  email_verified: z.boolean().optional(),
  country: z.string().optional(),
});

export type DropboxAccountInfo = z.infer<typeof DropboxAccountInfoSchema>;

export type DropboxOAuthResult = {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  accountId: string;
  userEmail: string;
  displayName: string;
};
