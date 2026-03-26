import { z } from "zod";

export const SeismicTokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
  token_type: z.string(),
});

export type SeismicTokenResponse = z.infer<typeof SeismicTokenResponseSchema>;

export const SeismicUserInfoSchema = z.object({
  id: z.string(),
  emailAddress: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  teamSiteId: z.string().optional(),
  teamSiteName: z.string().optional(),
});

export type SeismicUserInfo = z.infer<typeof SeismicUserInfoSchema>;

export type SeismicOAuthResult = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  userId: string;
  userEmail: string;
  userName: string;
  tenantId?: string;
  tenantName?: string;
};
