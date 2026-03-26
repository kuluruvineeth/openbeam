import { z } from "zod";

export const ShowpadTokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  token_type: z.string(),
  expires_in: z.number(),
});

export type ShowpadTokenResponse = z.infer<typeof ShowpadTokenResponseSchema>;

export const ShowpadCurrentUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export type ShowpadCurrentUser = z.infer<typeof ShowpadCurrentUserSchema>;

export type ShowpadOAuthResult = {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  userId: string;
  userEmail: string;
  displayName: string;
  subdomain: string;
};
