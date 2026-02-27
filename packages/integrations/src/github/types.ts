import { z } from "zod";

export const GitHubTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  scope: z.string().optional(),
  refresh_token: z.string().optional(),
  expires_in: z.number().optional(),
  refresh_token_expires_in: z.number().optional(),
});

export type GitHubTokenResponse = z.infer<typeof GitHubTokenResponseSchema>;

export const GitHubUserSchema = z.object({
  id: z.number(),
  login: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  avatar_url: z.string().url().nullable(),
  html_url: z.string().url(),
  type: z.string(),
});

export type GitHubUser = z.infer<typeof GitHubUserSchema>;

export const GitHubEmailSchema = z.object({
  email: z.string().email(),
  primary: z.boolean(),
  verified: z.boolean(),
  visibility: z.string().nullable().optional(),
});

export type GitHubEmail = z.infer<typeof GitHubEmailSchema>;

export interface GitHubAuthResult {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  scopes: string[];
  userId: string;
  userLogin: string;
  userName?: string;
  userEmail?: string;
  avatarUrl?: string;
  profileUrl: string;
  accountType: string;
}
