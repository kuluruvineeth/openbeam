import { z } from "zod";

export const MondayTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.literal("Bearer"),
  scope: z.string().optional(),
});

export type MondayTokenResponse = z.infer<typeof MondayTokenResponseSchema>;

export const MondayMeSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string(),
  photo_thumb_small: z.string().nullable().optional(),
  account: z.object({
    id: z.number(),
    name: z.string(),
    slug: z.string(),
  }),
});

export type MondayMe = z.infer<typeof MondayMeSchema>;

export interface MondayAuthResult {
  accessToken: string;
  userId: number;
  userName: string;
  userEmail: string;
  accountId: number;
  accountName: string;
  accountSlug: string;
}
