import { z } from "zod";

export const MiroTokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
  token_type: z.string(),
  scope: z.string(),
  team_id: z.string(),
  user_id: z.string(),
});

export type MiroTokenResponse = z.infer<typeof MiroTokenResponseSchema>;

export const MiroUserInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().optional(),
});

export type MiroUserInfo = z.infer<typeof MiroUserInfoSchema>;

export const MiroTeamInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export type MiroTeamInfo = z.infer<typeof MiroTeamInfoSchema>;

export type MiroOAuthResult = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  teamId: string;
  userId: string;
  userName: string;
  userEmail?: string;
  teamName?: string;
};
