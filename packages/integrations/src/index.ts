import gmailApp from "./gmail/config";
import googleDriveApp from "./google-drive/config";
import slackApp from "./slack/config";
import type { UnifiedApp } from "./types";

// Gmail exports
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

// Google Drive exports
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

// Slack exports
export * from "./slack/oauth";
export * from "./slack/types";

// Common exports
export * from "./types";

export const appStore: UnifiedApp[] = [gmailApp, googleDriveApp, slackApp];

export { default as gmailApp } from "./gmail/config";
export { default as googleDriveApp } from "./google-drive/config";
export { default as slackApp } from "./slack/config";
