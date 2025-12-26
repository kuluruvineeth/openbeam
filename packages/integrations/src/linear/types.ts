import { z } from "zod";

export const LinearTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.literal("Bearer"),
  expires_in: z.number(),
  refresh_token: z.string().optional(),
  scope: z.string(),
});

export type LinearTokenResponse = z.infer<typeof LinearTokenResponseSchema>;

export const LinearViewerSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  avatarUrl: z.string().nullable(),
  organization: z.object({
    id: z.string(),
    name: z.string(),
    urlKey: z.string(),
  }),
});

export type LinearViewer = z.infer<typeof LinearViewerSchema>;

export interface LinearAuthResult {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  userId: string;
  userName: string;
  userEmail: string;
  organizationId: string;
  organizationName: string;
  urlKey: string;
}
