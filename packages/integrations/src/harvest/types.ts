import { z } from "zod";

export const HarvestTokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
  token_type: z.string(),
});

export type HarvestTokenResponse = z.infer<typeof HarvestTokenResponseSchema>;

export const HarvestAccountSchema = z.object({
  id: z.number(),
  name: z.string(),
  product: z.string(),
});

export const HarvestUserInfoSchema = z.object({
  user: z.object({
    id: z.number(),
    first_name: z.string(),
    last_name: z.string(),
    email: z.string(),
  }),
  accounts: z.array(HarvestAccountSchema),
});

export type HarvestUserInfo = z.infer<typeof HarvestUserInfoSchema>;

export type HarvestOAuthResult = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  userId: string;
  userEmail: string;
  userName: string;
  accountId: string;
  accountName: string;
};
