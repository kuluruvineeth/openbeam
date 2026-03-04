import { z } from "zod";

export const IoTTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
  organizationName: z.string().optional(),
  defaultSite: z.string().optional(),
  timezone: z.string().optional(),
});

export type IoTTransformContext = z.infer<typeof IoTTransformContextSchema>;

export interface GeoMetadata {
  latitude: number;
  longitude: number;
  location_name?: string;
  altitude_meters?: number;
  heading_degrees?: number;
  speed_mph?: number;
}

export const IoTDocumentType = {
  DEVICE: "device",
  DEVICE_EVENT: "device_event",
  SENSOR_READING: "sensor_reading",
  ALERT: "alert",
  MEDIA_REFERENCE: "media_reference",
  AUTOMATION: "automation",
} as const;

export type IoTDocumentType =
  (typeof IoTDocumentType)[keyof typeof IoTDocumentType];
