import { z } from "zod";

export const NotionOwnerSchema = z.object({
  type: z.enum(["user", "workspace"]),
  user: z
    .object({
      object: z.literal("user"),
      id: z.string(),
      name: z.string().optional(),
      avatar_url: z.string().nullable().optional(),
      type: z.enum(["person", "bot"]).optional(),
      person: z.object({ email: z.string() }).optional(),
    })
    .optional(),
  workspace: z.boolean().optional(),
});

export const NotionOAuthResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.literal("bearer"),
  bot_id: z.string(),
  workspace_id: z.string(),
  workspace_name: z.string().optional(),
  workspace_icon: z.string().nullable().optional(),
  duplicated_template_id: z.string().nullable().optional(),
  request_id: z.string().optional(),
  owner: NotionOwnerSchema.optional(),
});

export type NotionOAuthResponse = z.infer<typeof NotionOAuthResponseSchema>;

export const NotionAuthResultSchema = z.object({
  accessToken: z.string(),
  botId: z.string(),
  workspaceId: z.string(),
  workspaceName: z.string().optional(),
  workspaceIcon: z.string().optional(),
  ownerUserId: z.string().optional(),
  ownerEmail: z.string().optional(),
});

export type NotionAuthResult = z.infer<typeof NotionAuthResultSchema>;
