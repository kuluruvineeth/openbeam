import type React from "react";

export {
  AppTypeSchema,
  AuthTypeSchema,
  ConnectorTypeSchema,
  DocumentTypeCategorySchema,
  SyncModeSchema,
} from "@openplane/types/connectors";

export type LogoProps = {
  size?: number;
  className?: string;
};

export type LogoComponent = React.ComponentType<LogoProps>;

export enum ConnectorType {
  SOURCE = "SOURCE",
  DESTINATION = "DESTINATION",
}

export enum AuthType {
  OAUTH2 = "OAUTH2",
  SERVICE_ACCOUNT = "SERVICE_ACCOUNT",
  API_KEY = "API_KEY",
  BASIC = "BASIC",
  SESSION = "SESSION",
}

export enum AppType {
  SLACK = "SLACK",
  GMAIL = "GMAIL",
  GOOGLE_DRIVE = "GOOGLE_DRIVE",
  NOTION = "NOTION",
  LINEAR = "LINEAR",
}

export type DocumentTypeCategory =
  | "message"
  | "email"
  | "file"
  | "folder"
  | "document"
  | "spreadsheet"
  | "presentation"
  | "image"
  | "issue"
  | "ticket"
  | "pull_request"
  | "task"
  | "event"
  | "page"
  | "comment"
  | "channel"
  | "unknown";

export type DocumentTypeDisplay = {
  label: string;
  iconKey: string;
  category: DocumentTypeCategory;
};

export type SearchDisplayConfig = {
  defaultIconKey: string;
  documentTypes: Record<string, DocumentTypeDisplay>;
  mimeTypes?: Record<string, DocumentTypeDisplay>;
  formatSourceName?: (sourceName: string, sourceType?: string) => string;
  contentPrimaryDocTypes?: string[];
};

export enum SyncMode {
  REALTIME = "REALTIME",
  PERIODIC = "PERIODIC",
  ON_DEMAND = "ON_DEMAND",
}

export type StreamDefinition = {
  name: string;
  label: string;
  description: string;
  entityType: "resource" | "activity" | "identity";
  dataPoints: string[];
  isPii?: boolean;

  syncMode: SyncMode;
  defaultInterval?: number;
  supportsBackfill?: boolean;
  rateLimit?: number;
};

export type OAuthConfig = {
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  redirectPath?: string;
};

export type ApiKeyConfig = {
  headerName?: string;
  documentationUrl?: string;
};

export type ServiceAccountConfig = {
  requiredScopes: string[];
  documentationUrl?: string;
  delegatedUserEmail?: boolean;
};

export type AuthConfig =
  | { type: typeof AuthType.OAUTH2; config: OAuthConfig }
  | { type: typeof AuthType.SERVICE_ACCOUNT; config: ServiceAccountConfig }
  | { type: typeof AuthType.API_KEY; config: ApiKeyConfig }
  | { type: typeof AuthType.BASIC | typeof AuthType.SESSION; config?: never };

export type SettingValue = string | number | boolean;

export type SettingDependency = {
  field: string;
  value: SettingValue;
};

export type AppSettingsItem = {
  id: string;
  label: string;
  description: string;
  type:
    | "text"
    | "password"
    | "switch"
    | "select"
    | "number"
    | "file"
    | "textarea";
  required: boolean;
  value: SettingValue;
  options?: Array<{ label: string; value: string }>;
  placeholder?: string;
  enabled?: boolean;
  dependsOn?: SettingDependency | SettingDependency[];
  accept?: string;
  fileType?: "json" | "pem" | "any";
  rows?: number;
};

export type UnifiedApp = {
  id: AppType;
  name: string;
  category: string;
  active: boolean;
  logo?: LogoComponent | string;
  short_description?: string;
  description?: string;
  images: string[];
  installed: boolean;
  type: "official" | "external";
  connectorType: ConnectorType;

  connectorId?: string;
  clientId?: string;
  status?: "ACTIVE" | "CONNECTING" | "ERROR" | "INACTIVE" | "SYNCING";

  features: string[];

  auth: AuthConfig;

  streams: StreamDefinition[];

  onInitialize?: () => Promise<void>;

  settings?: AppSettingsItem[];

  userSettings?: Record<string, SettingValue>;

  developerName?: string;
  website?: string;
  installUrl?: string;
  screenshots?: string[];
  overview?: string;
  createdAt?: string;
  approvalStatus?: "draft" | "pending" | "approved" | "rejected";
  lastUsedAt?: string;

  searchDisplay?: SearchDisplayConfig;
};
