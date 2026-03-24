import { z } from "zod";

export const EgnyteTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number().optional(),
});

export type EgnyteTokenResponse = z.infer<typeof EgnyteTokenResponseSchema>;

export const EgnyteUserInfoSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  status: z.string().optional(),
  user_type: z.string().optional(),
});

export type EgnyteUserInfo = z.infer<typeof EgnyteUserInfoSchema>;

export type EgnyteOAuthResult = {
  accessToken: string;
  userId: string;
  userEmail: string;
  displayName: string;
  domain: string;
};
