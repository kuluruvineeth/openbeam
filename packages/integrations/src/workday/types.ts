import { z } from "zod";

export const WorkdayTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
  refresh_token: z.string().optional(),
  scope: z.string().optional(),
});

export type WorkdayTokenResponse = z.infer<typeof WorkdayTokenResponseSchema>;

export const WorkdayUserInfoSchema = z.object({
  sub: z.string(),
  name: z.string().optional(),
  email: z.string().optional(),
});

export type WorkdayUserInfo = z.infer<typeof WorkdayUserInfoSchema>;

export interface WorkdayOAuthResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tenant: string;
  host: string;
  userName?: string;
  userEmail?: string;
}
