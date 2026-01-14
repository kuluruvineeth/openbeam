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

export type GmailMessage = {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  payload?: {
    headers?: Array<{ name: string; value: string }>;
  };
};

export type GmailLabel = {
  id: string;
  name: string;
  type?: "system" | "user";
};

export type GmailAuthMethod = "oauth" | "service_account";

export type GmailConfig =
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
