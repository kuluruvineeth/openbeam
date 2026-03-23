import { z } from "zod";

export const PipedriveTokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
  token_type: z.string(),
  scope: z.string(),
  api_domain: z.string(),
});

export type PipedriveTokenResponse = z.infer<
  typeof PipedriveTokenResponseSchema
>;

export const PipedriveUserInfoSchema = z.object({
  data: z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
    company_id: z.number(),
    company_name: z.string().optional(),
    company_domain: z.string().optional(),
  }),
});

export type PipedriveUserInfo = z.infer<typeof PipedriveUserInfoSchema>;

export type PipedriveOAuthResult = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  apiDomain: string;
  userId: string;
  userEmail: string;
  userName: string;
  companyId: string;
  companyName?: string;
  companyDomain?: string;
};
