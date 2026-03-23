import { z } from "zod";

export const AzureDevOpsTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.coerce.number(),
  refresh_token: z.string().optional(),
  scope: z.string().optional(),
});

export type AzureDevOpsTokenResponse = z.infer<
  typeof AzureDevOpsTokenResponseSchema
>;

export const AzureDevOpsProfileSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  emailAddress: z.string().optional(),
  publicAlias: z.string().optional(),
});

export type AzureDevOpsProfile = z.infer<typeof AzureDevOpsProfileSchema>;

export type AzureDevOpsAuthResult = {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  userId: string;
  userName: string;
  userEmail?: string;
};

export type AzureDevOpsOAuthResult = AzureDevOpsAuthResult;
