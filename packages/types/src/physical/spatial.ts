import { z } from "zod";

export const GeoLocationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  altitude: z.number().optional(),
  accuracy: z.number().optional(),
});

export type GeoLocation = z.infer<typeof GeoLocationSchema>;

export const SpatialPositionSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
  coordinate_system: z.enum(["cartesian", "wgs84", "local"]),
  reference_frame: z.string().optional(),
});

export type SpatialPosition = z.infer<typeof SpatialPositionSchema>;

export const SpatialRotationSchema = z.object({
  quaternion: z
    .tuple([z.number(), z.number(), z.number(), z.number()])
    .optional(),
  euler: z
    .object({
      roll: z.number(),
      pitch: z.number(),
      yaw: z.number(),
    })
    .optional(),
});

export type SpatialRotation = z.infer<typeof SpatialRotationSchema>;

export const SpatialBoundsSchema = z.object({
  min: z.tuple([z.number(), z.number(), z.number()]),
  max: z.tuple([z.number(), z.number(), z.number()]),
});

export type SpatialBounds = z.infer<typeof SpatialBoundsSchema>;

export const SpatialMetadataSchema = z.object({
  geo_location: GeoLocationSchema.optional(),
  spatial_position: SpatialPositionSchema.optional(),
  spatial_rotation: SpatialRotationSchema.optional(),
  spatial_bounds: SpatialBoundsSchema.optional(),
  floor: z.string().optional(),
  room: z.string().optional(),
  zone: z.string().optional(),
  building: z.string().optional(),
  facility: z.string().optional(),
});

export type SpatialMetadata = z.infer<typeof SpatialMetadataSchema>;

export const SpatialAnnotationSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  documentId: z.string(),
  anchorType: z.enum(["world", "object", "plane", "barcode"]),
  position: z.tuple([z.number(), z.number(), z.number()]),
  rotation: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  referenceObjectId: z.string().optional(),
  barcodePayload: z.string().optional(),
  displayType: z.enum(["panel", "tag", "overlay", "callout"]),
  content: z.object({
    title: z.string(),
    summary: z.string(),
    documentUrl: z.string().optional(),
  }),
  createdBy: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type SpatialAnnotation = z.infer<typeof SpatialAnnotationSchema>;

export const SpatialQueryRequestSchema = z.object({
  query: z.string(),
  context: z.object({
    objectId: z.string().optional(),
    barcode: z.string().optional(),
    position: SpatialPositionSchema.optional(),
    roomId: z.string().optional(),
    buildingId: z.string().optional(),
  }),
  modality: z.enum(["text", "object_recognition", "barcode", "voice"]),
  maxResults: z.number().optional(),
});

export type SpatialQueryRequest = z.infer<typeof SpatialQueryRequestSchema>;
