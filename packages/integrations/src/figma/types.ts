import { z } from "zod";

export const FigmaTokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  expires_in: z.number(),
  user_id: z.string().optional(),
});

export type FigmaTokenResponse = z.infer<typeof FigmaTokenResponseSchema>;

export const FigmaMeSchema = z.object({
  id: z.string(),
  email: z.string(),
  handle: z.string(),
  img_url: z.string().optional(),
});

export type FigmaMe = z.infer<typeof FigmaMeSchema>;

export interface FigmaAuthResult {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  userId: string;
  userEmail: string;
  userHandle: string;
}
