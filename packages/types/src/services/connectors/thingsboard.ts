import { z } from "zod";

export const ThingsboardConnectionConfigSchema = z.object({
  connectorId: z.string(),
  baseUrl: z.string(),
  username: z.string(),
  password: z.string(),
  timeout: z.number().default(30_000),
});

export type ThingsboardConnectionConfig = z.infer<
  typeof ThingsboardConnectionConfigSchema
>;

export const ThingsboardSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  devicePageLink: z.string().optional(),
  telemetryKeys: z.record(z.string(), z.number()).optional(),
  lastAlarmTime: z.number().optional(),
});

export type ThingsboardSyncCursor = z.infer<typeof ThingsboardSyncCursorSchema>;

export interface ThingsboardSyncOptions {
  cursor?: ThingsboardSyncCursor;
  batchSize?: number;
  forceFullSync?: boolean;
  syncTelemetry?: boolean;
  syncAlarms?: boolean;
  syncDashboards?: boolean;
  telemetryLookbackHours?: number;
}

export interface ThingsboardTransformContext {
  connectorId: string;
  connectorType: string;
  teamId: string;
  workspaceId: string;
  baseUrl: string;
}

export interface ThingsboardDevice {
  id: { id: string; entityType: string };
  name: string;
  type: string;
  label?: string;
  createdTime: number;
  additionalInfo?: Record<string, unknown>;
  customerId?: { id: string; entityType: string };
  deviceProfileId?: { id: string; entityType: string };
}

export interface ThingsboardTelemetryValue {
  ts: number;
  value: string | number | boolean;
}

export interface ThingsboardAttribute {
  key: string;
  lastUpdateTs: number;
  value: unknown;
}

export interface ThingsboardAlarm {
  id: { id: string; entityType: string };
  type: string;
  severity: "CRITICAL" | "MAJOR" | "MINOR" | "WARNING" | "INDETERMINATE";
  status: string;
  startTs: number;
  endTs?: number;
  ackTs?: number;
  clearTs?: number;
  originator: { id: string; entityType: string };
  originatorName?: string;
  details?: Record<string, unknown>;
}

export interface ThingsboardDashboard {
  id: { id: string; entityType: string };
  title: string;
  createdTime: number;
  configuration?: Record<string, unknown>;
  assignedCustomers?: Array<{ customerId: { id: string } }>;
}

export interface ThingsboardPageData<T> {
  data: T[];
  totalPages: number;
  totalElements: number;
  hasNext: boolean;
}

export interface ThingsboardSyncBatch<T> {
  items: T[];
  cursor: ThingsboardSyncCursor;
  hasMore: boolean;
  stage: string;
}
