import { z } from "zod";
import { BaseNode, nodeType, objectId } from "../base";

export const ZoneNode = BaseNode.extend({
  id: objectId("zone"),
  type: nodeType("zone"),
  name: z.string(),
  polygon: z.array(z.tuple([z.number(), z.number()])),
  color: z.string().default("#3b82f6"),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

export type ZoneNode = z.infer<typeof ZoneNode>;
