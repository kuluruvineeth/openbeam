import { z } from "zod";

export const MarketoTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
  scope: z.string().optional(),
});

export type MarketoTokenResponse = z.infer<typeof MarketoTokenResponseSchema>;

export type MarketoAuthResult = {
  accessToken: string;
  expiresIn: number;
  munchkinId: string;
};
