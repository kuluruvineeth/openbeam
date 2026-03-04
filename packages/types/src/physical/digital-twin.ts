import { z } from "zod";
import { SpatialBoundsSchema, SpatialPositionSchema } from "./spatial";

export const TwinNodeTypeSchema = z.enum([
  "asset",
  "zone",
  "sensor",
  "annotation",
  "material",
  "camera",
  "light",
]);

export type TwinNodeType = z.infer<typeof TwinNodeTypeSchema>;

export const DigitalTwinNodeSchema = z.object({
  id: z.string(),
  stageId: z.string(),
  primPath: z.string(),
  primType: z.string(),
  nodeType: TwinNodeTypeSchema,
  name: z.string(),
  parentId: z.string().optional(),
  position: SpatialPositionSchema.optional(),
  bounds: SpatialBoundsSchema.optional(),
  properties: z.record(z.string(), z.unknown()).optional(),
  assetInfo: z
    .object({
      identifier: z.string().optional(),
      version: z.string().optional(),
    })
    .optional(),
});

export type DigitalTwinNode = z.infer<typeof DigitalTwinNodeSchema>;

export const TwinRelationshipTypeSchema = z.enum([
  "parent_child",
  "reference",
  "connection",
  "containment",
  "dependency",
]);

export type TwinRelationshipType = z.infer<typeof TwinRelationshipTypeSchema>;

export const TwinRelationshipSchema = z.object({
  sourceId: z.string(),
  targetId: z.string(),
  type: TwinRelationshipTypeSchema,
  label: z.string().optional(),
});

export type TwinRelationship = z.infer<typeof TwinRelationshipSchema>;

export const TwinStateSchema = z.object({
  nodeId: z.string(),
  timestamp: z.number(),
  values: z.record(z.string(), z.unknown()),
  status: z.enum(["online", "offline", "degraded", "unknown"]).optional(),
});

export type TwinState = z.infer<typeof TwinStateSchema>;
