import { z } from "zod";
import { BaseNode, nodeType, objectId } from "../base";

export const SlabNode = BaseNode.extend({
  id: objectId("slab"),
  type: nodeType("slab"),
  polygon: z.array(z.tuple([z.number(), z.number()])),
  holes: z.array(z.array(z.tuple([z.number(), z.number()]))).default([]),
  elevation: z.number().default(0.05),
});

export type SlabNode = z.infer<typeof SlabNode>;
