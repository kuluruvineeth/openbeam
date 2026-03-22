import { z } from "zod";

export const ClickUpTokenResponseSchema = z.object({
  access_token: z.string(),
});

export type ClickUpTokenResponse = z.infer<typeof ClickUpTokenResponseSchema>;

export const ClickUpUserSchema = z.object({
  id: z.number(),
  username: z.string().nullable(),
  email: z.string(),
  color: z.string().nullable(),
  profilePicture: z.string().nullable(),
  initials: z.string().nullable(),
});

export type ClickUpUser = z.infer<typeof ClickUpUserSchema>;

export const ClickUpWorkspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().nullable().optional(),
  avatar: z.string().nullable().optional(),
  members: z
    .array(
      z.object({
        user: ClickUpUserSchema,
      })
    )
    .optional(),
});

export type ClickUpWorkspace = z.infer<typeof ClickUpWorkspaceSchema>;

export interface ClickUpAuthResult {
  accessToken: string;
  userId: number;
  userName: string;
  userEmail: string;
  workspaces: Array<{ id: string; name: string }>;
}
