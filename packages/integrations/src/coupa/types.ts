import { z } from "zod";

export const CoupaTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
  scope: z.string().optional(),
});

export type CoupaTokenResponse = z.infer<typeof CoupaTokenResponseSchema>;

export type CoupaAuthResult = {
  accessToken: string;
  expiresIn: number;
  instanceUrl: string;
};
