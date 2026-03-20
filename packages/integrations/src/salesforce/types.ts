import { z } from "zod";

export const SalesforceTokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  instance_url: z.string(),
  id: z.string(),
  token_type: z.string(),
  issued_at: z.string(),
  signature: z.string(),
});

export type SalesforceTokenResponse = z.infer<
  typeof SalesforceTokenResponseSchema
>;

export const SalesforceUserInfoSchema = z.object({
  sub: z.string(),
  name: z.string().optional(),
  email: z.string().optional(),
  preferred_username: z.string().optional(),
  organization_id: z.string().optional(),
  nickname: z.string().optional(),
});

export type SalesforceUserInfo = z.infer<typeof SalesforceUserInfoSchema>;

export type SalesforceOAuthResult = {
  accessToken: string;
  refreshToken?: string;
  instanceUrl: string;
  userId: string;
  userEmail?: string;
  displayName?: string;
  organizationId?: string;
};
