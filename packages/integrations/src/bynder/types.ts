import { z } from "zod";

export const BynderTokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  token_type: z.string(),
  expires_in: z.number(),
  scope: z.string().optional(),
});

export type BynderTokenResponse = z.infer<typeof BynderTokenResponseSchema>;

export const BynderCurrentUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().optional(),
  username: z.string().optional(),
  profileImageUrl: z.string().optional(),
});

export type BynderCurrentUser = z.infer<typeof BynderCurrentUserSchema>;

export type BynderOAuthResult = {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  userId: string;
  userEmail: string;
  displayName: string;
  domain: string;
};
