import { z } from "zod";

export const GitLabTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  refresh_token: z.string().optional(),
  expires_in: z.number(),
  created_at: z.number().optional(),
  scope: z.string().optional(),
});

export type GitLabTokenResponse = z.infer<typeof GitLabTokenResponseSchema>;

export const GitLabUserInfoSchema = z.object({
  id: z.number(),
  username: z.string(),
  name: z.string(),
  email: z.string().nullable().optional(),
  avatar_url: z.string().nullable(),
  web_url: z.string(),
  state: z.string(),
});

export type GitLabUserInfo = z.infer<typeof GitLabUserInfoSchema>;

export interface GitLabAuthResult {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  scopes: string[];
  userId: string;
  username: string;
  userName?: string;
  userEmail?: string;
  avatarUrl?: string;
  profileUrl: string;
}
