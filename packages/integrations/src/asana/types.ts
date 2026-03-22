import { z } from "zod";

export const AsanaTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
  refresh_token: z.string().optional(),
  data: z
    .object({
      id: z.number(),
      gid: z.string(),
      name: z.string(),
      email: z.string(),
    })
    .optional(),
});

export type AsanaTokenResponse = z.infer<typeof AsanaTokenResponseSchema>;

export const AsanaUserSchema = z.object({
  gid: z.string(),
  name: z.string(),
  email: z.string(),
});

export type AsanaUser = z.infer<typeof AsanaUserSchema>;

export const AsanaWorkspaceSchema = z.object({
  gid: z.string(),
  name: z.string(),
});

export type AsanaWorkspace = z.infer<typeof AsanaWorkspaceSchema>;

export interface AsanaOAuthResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  userGid: string;
  userName: string;
  userEmail: string;
  workspaces: AsanaWorkspace[];
}
