import { z } from "zod";

export const ContextRelationSchema = z.object({
  id: z.string(),
  sourceUri: z.string(),
  targetUri: z.string(),
  teamId: z.string(),
  reason: z.string().nullable(),
  relationType: z.string().nullable(),
  createdAt: z.coerce.date(),
});

export type ContextRelation = z.infer<typeof ContextRelationSchema>;

export const CreateContextRelationSchema = ContextRelationSchema.omit({
  id: true,
  createdAt: true,
});

export type CreateContextRelation = z.infer<typeof CreateContextRelationSchema>;
