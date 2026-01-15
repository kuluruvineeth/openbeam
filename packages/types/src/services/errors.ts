import { z } from "zod";

export const ConnectorErrorCodeSchema = z.enum([
  "AUTH_EXPIRED",
  "AUTH_INVALID",
  "RATE_LIMITED",
  "API_ERROR",
  "NETWORK_ERROR",
  "NOT_FOUND",
  "PERMISSION_DENIED",
  "SYNC_CONFLICT",
  "INVALID_CURSOR",
  "WEBHOOK_INVALID",
  "CONFIG_ERROR",
]);

export type ConnectorErrorCode = z.infer<typeof ConnectorErrorCodeSchema>;

export const ConnectorErrorOptionsSchema = z.object({
  retryAfterMs: z.number().optional(),
  connectorId: z.string().optional(),
  cause: z.instanceof(Error).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type ConnectorErrorOptions = z.infer<typeof ConnectorErrorOptionsSchema>;
