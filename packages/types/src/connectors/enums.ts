import { z } from "zod";

export const ConnectorTypeSchema = z.enum(["SOURCE", "DESTINATION"]);

export type ConnectorType = z.infer<typeof ConnectorTypeSchema>;

export const AuthTypeSchema = z.enum([
  "OAUTH2",
  "SERVICE_ACCOUNT",
  "API_KEY",
  "BASIC",
  "SESSION",
]);

export type AuthType = z.infer<typeof AuthTypeSchema>;

export const AppTypeSchema = z.enum([
  "SLACK",
  "GMAIL",
  "GOOGLE_DRIVE",
  "NOTION",
  "LINEAR",
]);

export type AppType = z.infer<typeof AppTypeSchema>;

export const SyncModeSchema = z.enum(["REALTIME", "PERIODIC", "ON_DEMAND"]);

export type SyncMode = z.infer<typeof SyncModeSchema>;
