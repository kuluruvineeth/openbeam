import { z } from "zod";

export const ShareLinkAccessTypeSchema = z.enum(["view", "download", "edit"]);

export type ShareLinkAccessType = z.infer<typeof ShareLinkAccessTypeSchema>;

export const CreateShareLinkInputSchema = z.object({
  teamId: z.string().min(1),
  userId: z.string().min(1),
  documentId: z.string().min(1),
  accessType: ShareLinkAccessTypeSchema.optional(),
  expiresAt: z.coerce.date().optional(),
  maxViews: z.number().int().positive().optional(),
  password: z.string().min(1).optional(),
});

export type CreateShareLinkInput = z.infer<typeof CreateShareLinkInputSchema>;

export const UpdateShareLinkInputSchema = z.object({
  accessType: ShareLinkAccessTypeSchema.optional(),
  expiresAt: z.coerce.date().nullable().optional(),
  maxViews: z.number().int().positive().nullable().optional(),
  password: z.string().min(1).nullable().optional(),
});

export type UpdateShareLinkInput = z.infer<typeof UpdateShareLinkInputSchema>;
