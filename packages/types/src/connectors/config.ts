export interface OAuthConfig {
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  redirectPath?: string;
}

export interface ApiKeyConfig {
  headerName?: string;
  documentationUrl?: string;
}

export interface ServiceAccountConfig {
  requiredScopes: string[];
  documentationUrl?: string;
  delegatedUserEmail?: boolean;
}

export type AuthConfig =
  | { type: "OAUTH2"; config: OAuthConfig }
  | { type: "SERVICE_ACCOUNT"; config: ServiceAccountConfig }
  | { type: "API_KEY"; config: ApiKeyConfig }
  | { type: "BASIC" | "SESSION"; config?: never };
