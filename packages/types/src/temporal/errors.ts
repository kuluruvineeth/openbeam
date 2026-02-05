import { z } from "zod";

export const TemporalErrorCodeSchema = z.enum([
  "CONNECTOR_NOT_FOUND",
  "AUTHORIZATION_ERROR",
  "RATE_LIMITED",
  "TIMEOUT",
  "INVALID_INPUT",
  "PROVIDER_ERROR",
  "STORAGE_ERROR",
  "INDEX_ERROR",
  "PARSE_ERROR",
]);

export type TemporalErrorCode = z.infer<typeof TemporalErrorCodeSchema>;

export const TemporalErrorSchema = z.object({
  code: TemporalErrorCodeSchema,
  message: z.string(),
  retryable: z.boolean(),
  details: z.record(z.string(), z.unknown()).optional(),
});

export type TemporalError = z.infer<typeof TemporalErrorSchema>;

export const NON_RETRYABLE_ERRORS: TemporalErrorCode[] = [
  "CONNECTOR_NOT_FOUND",
  "AUTHORIZATION_ERROR",
  "INVALID_INPUT",
];

export const RETRYABLE_ERRORS: TemporalErrorCode[] = [
  "RATE_LIMITED",
  "TIMEOUT",
  "PROVIDER_ERROR",
  "STORAGE_ERROR",
  "INDEX_ERROR",
  "PARSE_ERROR",
];
