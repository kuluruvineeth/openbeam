import { z } from "zod";
import { BaseNode, nodeType, objectId } from "../base";

export const RoofNode = BaseNode.extend({
  id: objectId("roof"),
  type: nodeType("roof"),
  position: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  rotation: z.number().default(0),
  length: z.number().default(4),
  height: z.number().default(1.5),
  leftWidth: z.number().default(1.5),
  rightWidth: z.number().default(1.5),
});

export type RoofNode = z.infer<typeof RoofNode>;
