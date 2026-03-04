import { bacnetApp } from "./bacnet/config";
import { githubApp } from "./github/config";
import { gmailApp } from "./gmail/config";
import { googleDriveApp } from "./google-drive/config";
import { linearApp } from "./linear/config";
import { mqttApp } from "./mqtt/config";
import { noderedApp } from "./nodered/config";
import { notionApp } from "./notion/config";
import { opcuaApp } from "./opcua/config";
import { samsaraApp } from "./samsara/config";
import { slackApp } from "./slack/config";
import { thingsboardApp } from "./thingsboard/config";
import type { UnifiedApp } from "./types";

export {
  bacnetApp,
  gmailApp,
  githubApp,
  googleDriveApp,
  linearApp,
  mqttApp,
  noderedApp,
  notionApp,
  opcuaApp,
  samsaraApp,
  slackApp,
  thingsboardApp,
};

export {
  exchangeGitHubCode,
  generateGitHubAuthUrl,
  refreshGitHubToken,
} from "./github/oauth";
export type {
  GitHubAuthResult,
  GitHubEmail,
  GitHubTokenResponse,
  GitHubUser,
} from "./github/types";

export {
  exchangeGmailCode,
  generateGmailAuthUrl,
  refreshGmailToken,
} from "./gmail/oauth";
export {
  GMAIL_SERVICE_ACCOUNT_SCOPES,
  getServiceAccountToken,
} from "./gmail/service-account";
export * from "./gmail/types";
export type {
  ExchangeGoogleCodeParams,
  GenerateGoogleAuthUrlParams,
  GoogleAuthConfig,
  GoogleAuthMethod,
  GoogleOAuthConfig,
  GoogleOAuthResult,
  GoogleServiceAccountConfig,
  GoogleServiceAccountResult,
  RefreshGoogleTokenParams,
  RefreshGoogleTokenResult,
} from "./google";

export {
  exchangeGoogleCode,
  fetchGoogleUserInfo,
  GoogleOAuthError,
  generateGoogleAuthUrl,
  refreshGoogleToken,
} from "./google";

export {
  exchangeGoogleDriveCode,
  generateGoogleDriveAuthUrl,
  refreshGoogleDriveToken,
} from "./google-drive/oauth";
export {
  GOOGLE_DRIVE_SERVICE_ACCOUNT_SCOPES,
  getGoogleDriveServiceAccountToken,
} from "./google-drive/service-account";
export type {
  GoogleDriveAuthMethod,
  GoogleDriveConfig,
  GoogleDriveFile,
  GoogleDriveFolder,
} from "./google-drive/types";

export {
  exchangeLinearCode,
  generateLinearAuthUrl,
  refreshLinearToken,
} from "./linear/oauth";
export type {
  LinearAuthResult,
  LinearTokenResponse,
  LinearViewer,
} from "./linear/types";

export { exchangeNotionCode, generateNotionAuthUrl } from "./notion/oauth";
export type { NotionAuthResult, NotionOAuthResponse } from "./notion/types";

export {
  createSecretRef,
  isSecretRef,
  resolveSecret,
  SecretResolutionError,
} from "./secrets";

export * from "./slack/oauth";
export * from "./slack/types";

export * from "./types";

export const appStore: UnifiedApp[] = [
  gmailApp,
  githubApp,
  googleDriveApp,
  linearApp,
  notionApp,
  samsaraApp,
  slackApp,
  mqttApp,
  opcuaApp,
  bacnetApp,
  thingsboardApp,
  noderedApp,
];
