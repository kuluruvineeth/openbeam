import type React from "react";

export enum ConnectorType {
  SOURCE = "SOURCE",
  DESTINATION = "DESTINATION",
}

export enum AuthType {
  OAUTH2 = "OAUTH2",
  API_KEY = "API_KEY",
  BASIC = "BASIC",
  SESSION = "SESSION",
}

export enum AppType {
  SLACK = "SLACK",
  GOOGLE_DRIVE = "GOOGLE_DRIVE",
  NOTION = "NOTION",
  GITHUB = "GITHUB",
  HUBSPOT = "HUBSPOT",
  SALESFORCE = "SALESFORCE",
  ZENDESK = "ZENDESK",
  INTERCOM = "INTERCOM",
  JIRA = "JIRA",
  ASANA = "ASANA",
  TRELLO = "TRELLO",
  AIRTABLE = "AIRTABLE",
  CLICKUP = "CLICKUP",
  LINEAR = "LINEAR",
  SHOPIFY = "SHOPIFY",
  STRIPE = "STRIPE",
  XERO = "XERO",
  QUICKBOOKS = "QUICKBOOKS",
  SAGE = "SAGE",
  NETSUITE = "NETSUITE",
  ZOHO = "ZOHO",
  MICROSOFT_TEAMS = "MICROSOFT_TEAMS",
  DISCORD = "DISCORD",
  WHATSAPP = "WHATSAPP",
  TWILIO = "TWILIO",
  SENDGRID = "SENDGRID",
  MAILCHIMP = "MAILCHIMP",
  HUBSPOT_MARKETING = "HUBSPOT_MARKETING",
  SALESFORCE_MARKETING = "SALESFORCE_MARKETING",
  MARKETO = "MARKETO",
  PARDOT = "PARDOT",
  ELASTICSEARCH = "ELASTICSEARCH",
  MONGODB = "MONGODB",
  POSTGRESQL = "POSTGRESQL",
  MYSQL = "MYSQL",
  SQLSERVER = "SQLSERVER",
  ORACLE = "ORACLE",
  SNOWFLAKE = "SNOWFLAKE",
  BIGQUERY = "BIGQUERY",
  REDSHIFT = "REDSHIFT",
  DATABRICKS = "DATABRICKS",
  S3 = "S3",
  GCS = "GCS",
  AZURE_BLOB = "AZURE_BLOB",
  BOX = "BOX",
  DROPBOX = "DROPBOX",
  ONEDRIVE = "ONEDRIVE",
  SHAREPOINT = "SHAREPOINT",
  SERVICENOW = "SERVICENOW",
  ZENDESK_SUPPORT = "ZENDESK_SUPPORT",
  JIRA_SERVICE_MANAGEMENT = "JIRA_SERVICE_MANAGEMENT",
  FRESHDESK = "FRESHDESK",
  INTERCOM_SUPPORT = "INTERCOM_SUPPORT",
  SALESFORCE_SERVICE_CLOUD = "SALESFORCE_SERVICE_CLOUD",
}

export enum SyncMode {
  REALTIME = "REALTIME", // Webhooks
  PERIODIC = "PERIODIC", // Polling
  ON_DEMAND = "ON_DEMAND", // User triggered only
}

export type StreamDefinition = {
  name: string;
  label: string;
  description: string;
  entityType: "resource" | "activity" | "identity";
  dataPoints: string[];
  isPii?: boolean;

  // Sync Capabilities
  syncMode: SyncMode;
  defaultInterval?: number; // In minutes, for PERIODIC sync
  supportsBackfill?: boolean; // Can we fetch historical data?
  rateLimit?: number; // Requests per minute (approximate guide)
};

export type ScopeDetail = {
  name: string;
  description: string;
};

export type OAuthConfig = {
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  scopeDetails?: ScopeDetail[];
};

export type ApiKeyConfig = {
  headerName?: string;
  documentationUrl?: string;
};

export type AuthConfig =
  | { type: typeof AuthType.OAUTH2; config: OAuthConfig }
  | { type: typeof AuthType.API_KEY; config: ApiKeyConfig }
  | { type: typeof AuthType.BASIC | typeof AuthType.SESSION; config?: never };

export type AppSettingsItem = {
  id: string;
  label: string;
  description: string;
  type: "text" | "password" | "switch" | "select";
  required: boolean;
  // biome-ignore lint/suspicious/noExplicitAny: value type varies
  value: any;
  options?: Array<{ label: string; value: string }>;
  placeholder?: string;
};

export type UnifiedApp = {
  id: AppType;
  name: string;
  category: string;
  active: boolean;
  logo?: React.ComponentType | string;
  short_description?: string;
  description?: string;
  images: string[];
  installed: boolean;
  type: "official" | "external";
  connectorType: ConnectorType;

  connectorId?: string;
  clientId?: string; // Added clientId

  features: string[];

  auth: AuthConfig;

  streams: StreamDefinition[];

  onInitialize?: () => Promise<void>;

  settings?: AppSettingsItem[];

  // biome-ignore lint/suspicious/noExplicitAny: user settings storage
  userSettings?: Record<string, any>;

  developerName?: string;
  website?: string;
  installUrl?: string;
  screenshots?: string[];
  overview?: string;
  createdAt?: string;
  status?: "draft" | "pending" | "approved" | "rejected";
  lastUsedAt?: string;
};
