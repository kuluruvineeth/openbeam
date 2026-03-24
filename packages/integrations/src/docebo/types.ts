import { z } from "zod";

export const DoceboTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
  scope: z.string().optional(),
});

export type DoceboTokenResponse = z.infer<typeof DoceboTokenResponseSchema>;

export type DoceboAuthResult = {
  accessToken: string;
  expiresIn: number;
  instanceUrl: string;
};
