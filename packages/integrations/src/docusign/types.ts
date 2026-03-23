import { z } from "zod";

export const DocuSignTokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
  token_type: z.string(),
});

export type DocuSignTokenResponse = z.infer<typeof DocuSignTokenResponseSchema>;

const DocuSignAccountSchema = z.object({
  account_id: z.string(),
  is_default: z.boolean(),
  account_name: z.string(),
  base_uri: z.string(),
});

export const DocuSignUserInfoSchema = z.object({
  sub: z.string(),
  name: z.string(),
  email: z.string(),
  accounts: z.array(DocuSignAccountSchema),
});

export type DocuSignUserInfo = z.infer<typeof DocuSignUserInfoSchema>;

export type DocuSignOAuthResult = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  userId: string;
  userEmail: string;
  userName: string;
  accountId: string;
  accountName: string;
  baseUri: string;
};
