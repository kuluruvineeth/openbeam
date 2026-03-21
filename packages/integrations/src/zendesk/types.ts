import { z } from "zod";

export const ZendeskTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  scope: z.string(),
});

export type ZendeskTokenResponse = z.infer<typeof ZendeskTokenResponseSchema>;

export const ZendeskUserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string(),
  role: z.string().optional(),
  organization_id: z.number().nullable().optional(),
});

export type ZendeskUser = z.infer<typeof ZendeskUserSchema>;

export type ZendeskOAuthResult = {
  accessToken: string;
  userId: string;
  userEmail: string;
  displayName?: string;
  organizationId?: string;
};
