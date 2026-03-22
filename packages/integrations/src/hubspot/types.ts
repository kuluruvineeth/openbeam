import { z } from "zod";

export const HubSpotTokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
  token_type: z.string(),
});

export type HubSpotTokenResponse = z.infer<typeof HubSpotTokenResponseSchema>;

export const HubSpotTokenInfoSchema = z.object({
  hub_id: z.number(),
  user_id: z.number(),
  user: z.string().optional(),
  hub_domain: z.string().optional(),
  scopes: z.array(z.string()).optional(),
  token_type: z.string().optional(),
});

export type HubSpotTokenInfo = z.infer<typeof HubSpotTokenInfoSchema>;

export type HubSpotOAuthResult = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  portalId: string;
  userId: string;
  userEmail?: string;
  hubDomain?: string;
};
