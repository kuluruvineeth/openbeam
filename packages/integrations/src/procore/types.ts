import { z } from "zod";

export const ProcoreTokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
  token_type: z.string(),
  created_at: z.number(),
});

export type ProcoreTokenResponse = z.infer<typeof ProcoreTokenResponseSchema>;

export const ProcoreUserInfoSchema = z.object({
  id: z.number(),
  login: z.string(),
  name: z.string(),
});

export type ProcoreUserInfo = z.infer<typeof ProcoreUserInfoSchema>;

export const ProcoreCompanySchema = z.object({
  id: z.number(),
  name: z.string(),
  is_active: z.boolean(),
});

export type ProcoreCompany = z.infer<typeof ProcoreCompanySchema>;

export type ProcoreOAuthResult = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  userId: string;
  userLogin: string;
  userName: string;
  companyId: string;
  companyName: string;
};
