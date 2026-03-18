import { z } from "zod";

export const EventSuffixSchema = z.enum([
  "click",
  "move",
  "enter",
  "leave",
  "pointerdown",
  "pointerup",
  "context-menu",
  "double-click",
]);

export const SpatialNodeEventSchema = z.object({
  position: z.tuple([z.number(), z.number(), z.number()]),
  localPosition: z.tuple([z.number(), z.number(), z.number()]),
  normal: z.tuple([z.number(), z.number(), z.number()]).optional(),
});

export type EventSuffix = z.infer<typeof EventSuffixSchema>;
export type SpatialNodeEvent<T = unknown> = z.infer<
  typeof SpatialNodeEventSchema
> & {
  node: T;
  stopPropagation: () => void;
};

export type SpatialEventNodeType =
  | "site"
  | "building"
  | "level"
  | "wall"
  | "item"
  | "zone"
  | "slab"
  | "ceiling"
  | "roof"
  | "scan"
  | "guide"
  | "window"
  | "door";

export type SpatialEventKey = `${SpatialEventNodeType}:${EventSuffix}`;

export type GridEvent = {
  position: [number, number, number];
  stopPropagation: () => void;
};
