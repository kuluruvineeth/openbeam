import { z } from "zod";

export const NiceCxoneTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
  scope: z.string().optional(),
});

export type NiceCxoneTokenResponse = z.infer<
  typeof NiceCxoneTokenResponseSchema
>;

export type NiceCxoneAuthResult = {
  accessToken: string;
  expiresIn: number;
  baseUrl: string;
};
