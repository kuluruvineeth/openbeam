import { z } from "zod";

export const BitbucketTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
  refresh_token: z.string(),
  scopes: z.string().optional(),
});

export type BitbucketTokenResponse = z.infer<
  typeof BitbucketTokenResponseSchema
>;

export const BitbucketUserInfoSchema = z.object({
  display_name: z.string(),
  uuid: z.string(),
  nickname: z.string().optional(),
  account_id: z.string().optional(),
  links: z
    .object({
      avatar: z.object({ href: z.string() }).optional(),
      html: z.object({ href: z.string() }).optional(),
    })
    .optional(),
});

export type BitbucketUserInfo = z.infer<typeof BitbucketUserInfoSchema>;

export interface BitbucketAuthResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  scopes: string[];
  userId: string;
  displayName: string;
  nickname?: string;
  avatarUrl?: string;
  profileUrl?: string;
}
