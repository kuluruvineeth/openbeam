import { z } from "zod";

export const AtlassianTokenResponseSchema = z.object({
  access_token: z.string(),
  expires_in: z.number(),
  refresh_token: z.string().optional(),
  scope: z.string().optional(),
  token_type: z.string(),
});

export type AtlassianTokenResponse = z.infer<
  typeof AtlassianTokenResponseSchema
>;

export const AtlassianUserInfoSchema = z.object({
  account_id: z.string(),
  email: z.string(),
  name: z.string().optional(),
  picture: z.string().optional(),
});

export type AtlassianUserInfo = z.infer<typeof AtlassianUserInfoSchema>;

export const AtlassianSiteSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  scopes: z.array(z.string()),
  avatarUrl: z.string().optional(),
});

export type AtlassianSite = z.infer<typeof AtlassianSiteSchema>;

export type AtlassianOAuthResult = {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  scopes: string[];
  userEmail: string;
  userId: string;
  displayName?: string;
  cloudId: string;
  siteName: string;
  siteUrl: string;
};
