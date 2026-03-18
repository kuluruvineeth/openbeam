import { z } from "zod";

export const SpatialSceneGraphSchema = z.object({
  nodes: z.record(z.string(), z.unknown()),
  rootNodeIds: z.array(z.string()),
});

export const SpatialSceneSchema = z.object({
  id: z.string(),
  name: z.string(),
  teamId: z.string(),
  createdById: z.string(),
  sceneGraph: SpatialSceneGraphSchema,
  thumbnail: z.string().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type SpatialSceneGraph = z.infer<typeof SpatialSceneGraphSchema>;
export type SpatialScene = z.infer<typeof SpatialSceneSchema>;
