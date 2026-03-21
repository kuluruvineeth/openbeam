export type {
  AppType as AppTypeEnum,
  AuthType as AuthTypeEnum,
  ConnectorType as ConnectorTypeEnum,
  SyncMode as SyncModeEnum,
} from "@openbeam/types/connectors";
export {
  AppTypeSchema,
  AuthTypeSchema,
  ConnectorTypeSchema,
  DocumentTypeCategorySchema,
  SyncModeSchema,
} from "@openbeam/types/connectors";
export type {
  ApiKeyConfig,
  AppSettingsItem,
  AuthConfig,
  DocumentTypeCategory,
  DocumentTypeDisplay,
  LogoComponent,
  LogoProps,
  OAuthConfig,
  SearchDisplayConfig,
  SecretRef,
  ServiceAccountConfig,
  SettingDependency,
  SettingValue,
  StreamDefinition,
  UnifiedApp,
} from "@openbeam/types/integrations";

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
  PUBLIC_DATASET = "PUBLIC_DATASET",
}

export enum AppType {
  SLACK = "SLACK",
  GMAIL = "GMAIL",
  GOOGLE_DRIVE = "GOOGLE_DRIVE",
  GOOGLE_CALENDAR = "GOOGLE_CALENDAR",
  NOTION = "NOTION",
  LINEAR = "LINEAR",
  GITHUB = "GITHUB",
  SAMSARA = "SAMSARA",
  VERKADA = "VERKADA",
  AWS_IOT = "AWS_IOT",
  AZURE_IOT = "AZURE_IOT",
  SMARTTHINGS = "SMARTTHINGS",
  MQTT = "MQTT",
  OPCUA = "OPCUA",
  BACNET = "BACNET",
  THINGSBOARD = "THINGSBOARD",
  NODERED = "NODERED",
  OMNIVERSE = "OMNIVERSE",
  MATTERPORT = "MATTERPORT",
  VIAM = "VIAM",
  FHIR = "FHIR",
  NVD = "NVD",
  CISA_KEV = "CISA_KEV",
  MITRE_ATTACK = "MITRE_ATTACK",
  OWASP = "OWASP",
  OUTLOOK = "OUTLOOK",
  SHAREPOINT = "SHAREPOINT",
  MICROSOFT_TEAMS = "MICROSOFT_TEAMS",
  CONFLUENCE = "CONFLUENCE",
  JIRA = "JIRA",
  SALESFORCE = "SALESFORCE",
}

export enum SyncMode {
  REALTIME = "REALTIME",
  PERIODIC = "PERIODIC",
  ON_DEMAND = "ON_DEMAND",
}
