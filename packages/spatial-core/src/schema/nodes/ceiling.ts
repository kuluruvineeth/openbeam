import { z } from "zod";
import { BaseNode, nodeType, objectId } from "../base";
import { ItemNode } from "./item";

export const CeilingNode = BaseNode.extend({
  id: objectId("ceiling"),
  type: nodeType("ceiling"),
  children: z.array(ItemNode.shape.id).default([]),
  polygon: z.array(z.tuple([z.number(), z.number()])),
  holes: z.array(z.array(z.tuple([z.number(), z.number()]))).default([]),
  height: z.number().default(2.5),
});

export type CeilingNode = z.infer<typeof CeilingNode>;
