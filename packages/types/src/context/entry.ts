import { z } from "zod";
import { ContextTypeSchema, OwnerTypeSchema } from "./enums";

export const ContextEntrySchema = z.object({
  id: z.string(),
  uri: z.string(),
  parentUri: z.string().nullable(),
  teamId: z.string(),
  ownerId: z.string(),
  ownerType: OwnerTypeSchema,
  contextType: ContextTypeSchema,
  category: z.string().nullable(),
  isLeaf: z.boolean().default(true),
  abstractText: z.string(),
  overview: z.string().nullable(),
  content: z.string().nullable(),
  activeCount: z.number().int().nonnegative().default(0),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type ContextEntry = z.infer<typeof ContextEntrySchema>;

export const CreateContextEntrySchema = ContextEntrySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateContextEntry = z.infer<typeof CreateContextEntrySchema>;

export const UpdateContextEntrySchema = ContextEntrySchema.pick({
  abstractText: true,
  overview: true,
  content: true,
  category: true,
  isLeaf: true,
  activeCount: true,
}).partial();

export type UpdateContextEntry = z.infer<typeof UpdateContextEntrySchema>;
