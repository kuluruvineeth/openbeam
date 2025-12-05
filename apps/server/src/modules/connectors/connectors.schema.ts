import { z } from "zod";

export const connectorIdParamsSchema = z.object({
  id: z.string().openapi({
    param: {
      name: "id",
      in: "path",
    },
    example: "cm3t5x8u00000j10y2x8u0000",
    description: "The unique identifier of the connector",
  }),
});

export const errorSchema = z.object({
  error: z.string(),
  details: z.string().optional(),
});

export const triggerSyncBodySchema = z.object({
  type: z.enum(["FULL", "INCREMENTAL"]).default("FULL").openapi({
    description: "The type of sync to trigger",
    example: "FULL",
  }),
});

export const triggerSyncResponseSchema = z.object({
  success: z.boolean(),
  syncJobId: z.string(),
  queueJobId: z.string(),
  type: z.string(),
  message: z.string(),
});

export const getSyncHistoryQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export const syncHistoryItemSchema = z.object({
  id: z.string(),
  status: z.string(),
  dataAdded: z.number(),
  dataUpdated: z.number(),
  dataDeleted: z.number(),
  errorMessage: z.string().nullable(),
  summary: z.any(), // JSON
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime().nullable(),
  durationMs: z.number().nullable(),
});

export const getSyncHistoryResponseSchema = z.object({
  connectorId: z.string(),
  history: z.array(syncHistoryItemSchema),
  pagination: z.object({
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
    hasMore: z.boolean(),
  }),
});

export const getSyncStatusResponseSchema = z.object({
  connector: z.object({
    id: z.string(),
    status: z.string(),
    lastSyncedAt: z.string().datetime().nullable(),
    lastSyncStatus: z.string().nullable(),
    lastError: z.string().nullable(),
    lastErrorAt: z.string().datetime().nullable(),
  }),
  latestSync: z
    .object({
      id: z.string(),
      status: z.string(),
      dataAdded: z.number(),
      startedAt: z.string().datetime(),
      finishedAt: z.string().datetime().nullable(),
      errorMessage: z.string().nullable(),
    })
    .nullable(),
  stats: z.object({
    totalIndexed: z.number(),
  }),
});

export const pauseResumeResponseSchema = z.object({
  success: z.boolean().optional(),
  message: z.string(),
});
