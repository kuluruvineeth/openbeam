import { z } from "zod";

export const FindConnectorOptionsSchema = z.object({
  id: z.string().optional(),
  teamId: z.string().optional(),
  app: z.string().optional(),
  includeOAuthProvider: z.boolean().optional(),
});

export type FindConnectorOptions = z.infer<typeof FindConnectorOptionsSchema>;

export const DecryptedOAuthCredentialsSchema = z.object({
  accessToken: z.string().nullable(),
  refreshToken: z.string().nullable(),
  clientId: z.string().nullable(),
  clientSecret: z.string().nullable(),
  tokenExpiresAt: z.date().nullable(),
  scopes: z.array(z.string()),
  tokenType: z.string().nullable(),
  isExpired: z.boolean(),
  expiresInSeconds: z.number().int().nullable(),
});

export type DecryptedOAuthCredentials = z.infer<
  typeof DecryptedOAuthCredentialsSchema
>;

export const LastSyncInfoSchema = z.object({
  id: z.string(),
  status: z.string(),
  createdAt: z.date(),
  completedAt: z.date().nullable(),
});

export type LastSyncInfo = z.infer<typeof LastSyncInfoSchema>;

export const ConnectorHealthInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  app: z.string(),
  status: z.string(),
  lastSyncAt: z.date().nullable(),
  lastError: z.string().nullable(),
  lastErrorAt: z.date().nullable(),
  tokenExpiresAt: z.date().nullable(),
  isTokenExpiringSoon: z.boolean(),
  documentCount: z.number().int(),
});

export type ConnectorHealthInfo = z.infer<typeof ConnectorHealthInfoSchema>;

export const SyncHistoryEntrySchema = z.object({
  id: z.string(),
  status: z.string(),
  type: z.string(),
  createdAt: z.date(),
  completedAt: z.date().nullable(),
  errorMessage: z.string().nullable(),
});

export type SyncHistoryEntry = z.infer<typeof SyncHistoryEntrySchema>;
