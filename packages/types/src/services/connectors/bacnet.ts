import { z } from "zod";

export const BacnetConnectionConfigSchema = z.object({
  connectorId: z.string(),
  interface: z.string().default("0.0.0.0"),
  port: z.number().default(47_808),
  broadcastAddress: z.string().default("255.255.255.255"),
  discoveryTimeout: z.number().default(5000),
  readTimeout: z.number().default(3000),
  covLifetime: z.number().default(300),
});

export type BacnetConnectionConfig = z.infer<
  typeof BacnetConnectionConfigSchema
>;

export const BacnetSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  discoveredDevices: z.array(z.number()).optional(),
  subscribedObjects: z.array(z.string()).optional(),
});

export type BacnetSyncCursor = z.infer<typeof BacnetSyncCursorSchema>;

export interface BacnetSyncOptions {
  cursor?: BacnetSyncCursor;
  batchSize?: number;
  forceFullSync?: boolean;
  pollInterval?: number;
  covEnabled?: boolean;
}

export interface BacnetTransformContext {
  connectorId: string;
  connectorType: string;
  teamId: string;
  workspaceId: string;
  networkInterface: string;
  siteName?: string;
  buildingName?: string;
}

export interface BacnetDevice {
  address: string;
  deviceId: number;
  maxApdu: number;
  segmentation: number;
  vendorId: number;
  objectName?: string;
  modelName?: string;
  firmwareRevision?: string;
  applicationSoftwareVersion?: string;
  location?: string;
  description?: string;
}

export interface BacnetObject {
  type: number;
  instance: number;
  objectName?: string;
  description?: string;
  presentValue?: number | boolean | string;
  units?: number;
  statusFlags?: number;
  covIncrement?: number;
  activeText?: string;
  inactiveText?: string;
  numberOfStates?: number;
  stateText?: string[];
}

export interface BacnetCovNotification {
  deviceAddress: string;
  deviceId: number;
  objectType: number;
  objectInstance: number;
  values: Array<{
    property: number;
    value: unknown;
  }>;
  timestamp: number;
}

export const BacnetObjectType = {
  ANALOG_INPUT: 0,
  ANALOG_OUTPUT: 1,
  ANALOG_VALUE: 2,
  BINARY_INPUT: 3,
  BINARY_OUTPUT: 4,
  BINARY_VALUE: 5,
  CALENDAR: 6,
  COMMAND: 7,
  DEVICE: 8,
  EVENT_ENROLLMENT: 9,
  FILE: 10,
  GROUP: 11,
  LOOP: 12,
  MULTI_STATE_INPUT: 13,
  MULTI_STATE_OUTPUT: 14,
  NOTIFICATION_CLASS: 15,
  PROGRAM: 16,
  SCHEDULE: 17,
  AVERAGING: 18,
  MULTI_STATE_VALUE: 19,
  TREND_LOG: 20,
} as const;

export type BacnetObjectType =
  (typeof BacnetObjectType)[keyof typeof BacnetObjectType];

export interface BacnetSyncBatch<T> {
  items: T[];
  cursor: BacnetSyncCursor;
  stage: string;
  hasMore: boolean;
}
