import { z } from "zod";

export const BoxTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
  refresh_token: z.string().optional(),
  restricted_to: z.array(z.unknown()).optional(),
});

export type BoxTokenResponse = z.infer<typeof BoxTokenResponseSchema>;

export const BoxUserInfoSchema = z.object({
  id: z.string(),
  type: z.literal("user"),
  name: z.string(),
  login: z.string(),
  enterprise: z
    .object({
      id: z.string(),
      name: z.string(),
    })
    .optional()
    .nullable(),
});

export type BoxUserInfo = z.infer<typeof BoxUserInfoSchema>;

export type BoxOAuthResult = {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  userId: string;
  userEmail: string;
  displayName: string;
  enterpriseId?: string;
};
