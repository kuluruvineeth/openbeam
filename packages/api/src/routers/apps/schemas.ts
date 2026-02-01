import { AppType, AuthType, ConnectorType } from "@openplane/integrations";
import { z } from "zod";
import { createZodEnum } from "../../utils/zod";

export const connectorIdSchema = z.object({
  connectorId: z.string().min(1),
});

export const appIdSchema = z.object({
  appId: z.string().min(1),
});

export const createConnectorSchema = z.object({
  appId: createZodEnum(AppType),
  workspaceExternalId: z.string().min(1),
  name: z.string().min(1),
  type: createZodEnum(ConnectorType),
  authType: createZodEnum(AuthType),
  config: z.record(z.string(), z.unknown()).optional(),
});

export const updateSettingsSchema = z.object({
  appId: z.string().min(1),
  config: z.record(z.string(), z.unknown()),
});

export const getSyncStatusSchema = connectorIdSchema;

export const getSyncHistorySchema = connectorIdSchema.extend({
  limit: z.number().int().min(1).max(100).default(20),
  cursor: z.number().nullish(), // Cursor for infinite query (offset)
  offset: z.number().int().min(0).default(0), // Keep offset for backward compatibility if needed, but we'll use cursor primarily
});

export const triggerSyncSchema = connectorIdSchema.extend({
  type: z.enum(["FULL", "INCREMENTAL"]).default("INCREMENTAL"),
});

export const updateSyncSettingsSchema = connectorIdSchema.extend({
  // BullMQ cron patterns require minimum 1 minute intervals
  fullSyncIntervalMs: z.number().int().min(60_000).optional(),
  incrementalSyncIntervalMs: z.number().int().min(60_000).optional(),
});

export const getWebhookStatusSchema = connectorIdSchema;
