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
  "MICROSOFT_TEAMS",
  "DISCORD",
  "WHATSAPP",
  "GMAIL",
  "OUTLOOK",
  "GOOGLE_DRIVE",
  "ONEDRIVE",
  "SHAREPOINT",
  "DROPBOX",
  "BOX",
  "NOTION",
  "CONFLUENCE",
  "CODA",
  "JIRA",
  "ASANA",
  "TRELLO",
  "CLICKUP",
  "LINEAR",
  "MONDAY",
  "BASECAMP",
  "GITHUB",
  "GITLAB",
  "BITBUCKET",
  "SALESFORCE",
  "HUBSPOT",
  "PIPEDRIVE",
  "ZOHO",
  "ZENDESK",
  "INTERCOM",
  "FRESHDESK",
  "SERVICENOW",
  "SAMSARA",
  "VERKADA",
  "AWS_IOT",
  "AZURE_IOT",
  "SMARTTHINGS",
  "MQTT",
  "OPCUA",
  "BACNET",
  "THINGSBOARD",
  "NODERED",
  "OMNIVERSE",
  "MATTERPORT",
  "VIAM",
  "FHIR",
]);

export type AppType = z.infer<typeof AppTypeSchema>;

export const SyncModeSchema = z.enum(["REALTIME", "PERIODIC", "ON_DEMAND"]);

export type SyncMode = z.infer<typeof SyncModeSchema>;

export const ConnectorStatusSchema = z.enum([
  "ACTIVE",
  "INACTIVE",
  "ERROR",
  "SYNCING",
  "CONNECTING",
  "PAUSED",
  "RATE_LIMITED",
  "AUTH_EXPIRED",
  "DELETING",
]);

export type ConnectorStatus = z.infer<typeof ConnectorStatusSchema>;
