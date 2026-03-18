import { z } from "zod";

export const CollectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().optional(),
  nodeIds: z.array(z.string()),
  controlNodeId: z.string().optional(),
});

export type Collection = z.infer<typeof CollectionSchema>;
export type CollectionId = `collection_${string}`;
