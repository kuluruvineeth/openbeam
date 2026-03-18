import { z } from "zod";

export const ToggleControlSchema = z.object({
  kind: z.literal("toggle"),
  label: z.string().optional(),
  default: z.boolean().optional(),
});

export const SliderControlSchema = z.object({
  kind: z.literal("slider"),
  label: z.string(),
  min: z.number(),
  max: z.number(),
  step: z.number().default(1),
  unit: z.string().optional(),
  displayMode: z.enum(["slider", "stepper", "dial"]).default("slider"),
  default: z.number().optional(),
});

export const TemperatureControlSchema = z.object({
  kind: z.literal("temperature"),
  label: z.string().default("Temperature"),
  min: z.number().default(16),
  max: z.number().default(30),
  unit: z.enum(["C", "F"]).default("C"),
  default: z.number().optional(),
});

export const ControlSchema = z.discriminatedUnion("kind", [
  ToggleControlSchema,
  SliderControlSchema,
  TemperatureControlSchema,
]);

export const AnimationEffectSchema = z.object({
  kind: z.literal("animation"),
  clips: z.object({
    on: z.string().optional(),
    off: z.string().optional(),
    loop: z.string().optional(),
  }),
});

export const LightEffectSchema = z.object({
  kind: z.literal("light"),
  color: z.string().default("#ffffff"),
  intensityRange: z.tuple([z.number(), z.number()]),
  distance: z.number().optional(),
  offset: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
});

export const EffectSchema = z.discriminatedUnion("kind", [
  AnimationEffectSchema,
  LightEffectSchema,
]);

export const InteractiveSchema = z.object({
  controls: z.array(ControlSchema).default([]),
  effects: z.array(EffectSchema).default([]),
});

export const AssetSchema = z.object({
  id: z.string(),
  category: z.string(),
  name: z.string(),
  thumbnail: z.string(),
  src: z.string(),
  dimensions: z.tuple([z.number(), z.number(), z.number()]).default([1, 1, 1]),
  attachTo: z.enum(["wall", "wall-side", "ceiling"]).optional(),
  tags: z.array(z.string()).optional(),
  offset: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  rotation: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  scale: z.tuple([z.number(), z.number(), z.number()]).default([1, 1, 1]),
  surface: z.object({ height: z.number() }).optional(),
  interactive: InteractiveSchema.optional(),
});

export const DoorSegmentSchema = z.object({
  type: z.enum(["panel", "glass", "empty"]),
  heightRatio: z.number(),
  columnRatios: z.array(z.number()).default([1]),
  dividerThickness: z.number().default(0.03),
  panelDepth: z.number().default(0.01),
  panelInset: z.number().default(0.04),
});

export type ToggleControl = z.infer<typeof ToggleControlSchema>;
export type SliderControl = z.infer<typeof SliderControlSchema>;
export type TemperatureControl = z.infer<typeof TemperatureControlSchema>;
export type Control = z.infer<typeof ControlSchema>;
export type AnimationEffect = z.infer<typeof AnimationEffectSchema>;
export type LightEffect = z.infer<typeof LightEffectSchema>;
export type Effect = z.infer<typeof EffectSchema>;
export type Interactive = z.infer<typeof InteractiveSchema>;
export type Asset = z.infer<typeof AssetSchema>;
export type AssetInput = z.input<typeof AssetSchema>;
export type DoorSegment = z.infer<typeof DoorSegmentSchema>;
