import { z } from "zod";
import { BaseNode, nodeType, objectId } from "../base";
import { ItemNode } from "./item";

export const WallNode = BaseNode.extend({
  id: objectId("wall"),
  type: nodeType("wall"),
  children: z.array(ItemNode.shape.id).default([]),
  thickness: z.number().optional(),
  height: z.number().optional(),
  start: z.tuple([z.number(), z.number()]),
  end: z.tuple([z.number(), z.number()]),
  frontSide: z.enum(["interior", "exterior", "unknown"]).default("unknown"),
  backSide: z.enum(["interior", "exterior", "unknown"]).default("unknown"),
});

export type WallNode = z.infer<typeof WallNode>;
