import { z } from "zod";

export const IntercomTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
});

export type IntercomTokenResponse = z.infer<typeof IntercomTokenResponseSchema>;

export const IntercomMeSchema = z.object({
  type: z.string(),
  id: z.string(),
  name: z.string().optional(),
  email: z.string().optional(),
  app: z
    .object({
      id_code: z.string().optional(),
      name: z.string().optional(),
    })
    .optional(),
});

export type IntercomMe = z.infer<typeof IntercomMeSchema>;

export type IntercomOAuthResult = {
  accessToken: string;
  adminId: string;
  adminEmail?: string;
  adminName?: string;
  appId?: string;
  workspaceName?: string;
};
