import { z } from "zod";
import { BaseNode, nodeType, objectId } from "../base";
import { LevelNode } from "./level";

export const BuildingNode = BaseNode.extend({
  id: objectId("building"),
  type: nodeType("building"),
  children: z.array(LevelNode.shape.id).default([]),
  position: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  rotation: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
});

export type BuildingNode = z.infer<typeof BuildingNode>;
