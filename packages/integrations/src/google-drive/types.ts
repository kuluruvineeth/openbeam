import type { ServiceAccountCredentials } from "../google";

export type {
  GoogleOAuthResult as OAuthResult,
  GoogleServiceAccountResult as ServiceAccountResult,
  OAuthCredentialsFile,
  ServiceAccountCredentials,
  TokenResponse,
  UserInfo,
} from "../google";
export {
  OAuthCredentialsFileSchema,
  parseOAuthCredentialsFile,
  parseServiceAccountCredentials,
  ServiceAccountCredentialsSchema,
  TokenResponseSchema,
  UserInfoSchema,
} from "../google";

export type GoogleDriveFile = {
  id: string;
  name: string;
  mimeType: string;
  parents?: string[];
  webViewLink?: string;
  modifiedTime?: string;
  createdTime?: string;
  size?: string;
  owners?: Array<{ emailAddress: string; displayName?: string }>;
};

export type GoogleDriveFolder = {
  id: string;
  name: string;
  parents?: string[];
};

export type GoogleDriveAuthMethod = "oauth" | "service_account";

export type GoogleDriveConfig =
  | {
      authMethod: "oauth";
      accessToken: string;
      refreshToken?: string;
      email: string;
    }
  | {
      authMethod: "service_account";
      credentials: ServiceAccountCredentials;
      delegatedEmail: string;
    };
