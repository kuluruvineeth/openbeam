import { z } from "zod";

export const CanvaTokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
  token_type: z.string(),
  scope: z.string().optional(),
});

export type CanvaTokenResponse = z.infer<typeof CanvaTokenResponseSchema>;

export const CanvaUserProfileSchema = z.object({
  user: z.object({
    id: z.string(),
    display_name: z.string().optional(),
  }),
  team: z
    .object({
      id: z.string(),
      display_name: z.string().optional(),
    })
    .optional(),
});

export type CanvaUserProfile = z.infer<typeof CanvaUserProfileSchema>;

export type CanvaOAuthResult = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  userId: string;
  displayName?: string;
  teamId?: string;
  teamName?: string;
};
