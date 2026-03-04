export type {
  AppType as AppTypeEnum,
  AuthType as AuthTypeEnum,
  ConnectorType as ConnectorTypeEnum,
  SyncMode as SyncModeEnum,
} from "@openplane/types/connectors";
export {
  AppTypeSchema,
  AuthTypeSchema,
  ConnectorTypeSchema,
  DocumentTypeCategorySchema,
  SyncModeSchema,
} from "@openplane/types/connectors";
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
} from "@openplane/types/integrations";

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
}

export enum SyncMode {
  REALTIME = "REALTIME",
  PERIODIC = "PERIODIC",
  ON_DEMAND = "ON_DEMAND",
}
