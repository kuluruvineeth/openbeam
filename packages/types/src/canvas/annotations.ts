import { z } from "zod";

export const AnnotationTypeSchema = z.enum([
  "freehand",
  "rectangle",
  "arrow",
  "text",
]);
export type AnnotationType = z.infer<typeof AnnotationTypeSchema>;

export const AnnotationAuthorSchema = z.enum(["human", "agent"]);
export type AnnotationAuthor = z.infer<typeof AnnotationAuthorSchema>;

export const AnnotationPointSchema = z.object({
  x: z.number(),
  y: z.number(),
  pressure: z.number().optional(),
});
export type AnnotationPoint = z.infer<typeof AnnotationPointSchema>;

export const SpatialAnnotationSchema = z.object({
  id: z.string(),
  type: AnnotationTypeSchema,
  points: z.array(AnnotationPointSchema),
  intersectingNodes: z.array(z.string()),
  label: z.string().optional(),
  author: AnnotationAuthorSchema,
  color: z.string().optional(),
  strokeWidth: z.number().optional(),
  createdAt: z.number(),
});
export type SpatialAnnotation = z.infer<typeof SpatialAnnotationSchema>;

export const ConnectionIntentSchema = z.object({
  source: z.string(),
  target: z.string(),
  confidence: z.number().min(0).max(1),
  inferredFrom: z.enum([
    "proximity",
    "type_compatibility",
    "execution_history",
    "explicit",
  ]),
});
export type ConnectionIntent = z.infer<typeof ConnectionIntentSchema>;

export const CanvasToolModeSchema = z.enum([
  "select",
  "pan",
  "add",
  "draw",
  "lasso",
  "rectangle",
  "eraser",
]);
export type CanvasToolMode = z.infer<typeof CanvasToolModeSchema>;

export const TemporaryEdgeDataSchema = z.object({
  isTemporary: z.literal(true),
  placeholder: z.string().optional(),
  suggestedType: z.string().optional(),
});
export type TemporaryEdgeData = z.infer<typeof TemporaryEdgeDataSchema>;
