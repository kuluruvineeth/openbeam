import { z } from "zod";

export const ServiceNowTokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
  scope: z.string(),
});

export type ServiceNowTokenResponse = z.infer<
  typeof ServiceNowTokenResponseSchema
>;

export const ServiceNowUserSchema = z.object({
  result: z.object({
    user_name: z.string(),
    user_sys_id: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().optional(),
  }),
});

export type ServiceNowUser = z.infer<typeof ServiceNowUserSchema>;

export type ServiceNowOAuthResult = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  userId: string;
  userEmail?: string;
  displayName?: string;
};
