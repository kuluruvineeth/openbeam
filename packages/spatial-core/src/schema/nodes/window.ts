import { z } from "zod";
import { BaseNode, nodeType, objectId } from "../base";

export const WindowNode = BaseNode.extend({
  id: objectId("window"),
  type: nodeType("window"),
  position: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  rotation: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  side: z.enum(["front", "back"]).optional(),
  wallId: z.string().optional(),
  width: z.number().default(1.5),
  height: z.number().default(1.5),
  frameThickness: z.number().default(0.05),
  frameDepth: z.number().default(0.07),
  columnRatios: z.array(z.number()).default([1]),
  rowRatios: z.array(z.number()).default([1]),
  columnDividerThickness: z.number().default(0.03),
  rowDividerThickness: z.number().default(0.03),
  sill: z.boolean().default(true),
  sillDepth: z.number().default(0.08),
  sillThickness: z.number().default(0.03),
});

export type WindowNode = z.infer<typeof WindowNode>;
