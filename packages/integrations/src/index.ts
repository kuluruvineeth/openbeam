import { awsIotApp } from "./aws-iot/config";
import { azureIotApp } from "./azure-iot/config";
import { bacnetApp } from "./bacnet/config";
import { cisaKevApp } from "./cisa-kev/config";
import { confluenceApp } from "./confluence/config";
import { dropboxApp } from "./dropbox/config";
import { fhirApp } from "./fhir/config";
import { githubApp } from "./github/config";
import { gmailApp } from "./gmail/config";
import { googleCalendarApp } from "./google-calendar/config";
import { googleDriveApp } from "./google-drive/config";
import { jiraApp } from "./jira/config";
import { linearApp } from "./linear/config";
import { matterportApp } from "./matterport/config";
import { microsoftCalendarApp } from "./microsoft-calendar/config";
import { mitreAttackApp } from "./mitre-attack/config";
import { mqttApp } from "./mqtt/config";
import { noderedApp } from "./nodered/config";
import { notionApp } from "./notion/config";
import { nvdApp } from "./nvd/config";
import { omniverseApp } from "./omniverse/config";
import { opcuaApp } from "./opcua/config";
import { outlookApp } from "./outlook/config";
import { owaspApp } from "./owasp/config";
import { salesforceApp } from "./salesforce/config";
import { samsaraApp } from "./samsara/config";
import { servicenowApp } from "./servicenow/config";
import { sharePointApp } from "./sharepoint/config";
import { slackApp } from "./slack/config";
import { smartThingsApp } from "./smartthings/config";
import { teamsApp } from "./teams/config";
import { thingsboardApp } from "./thingsboard/config";
import type { UnifiedApp } from "./types";
import { verkadaApp } from "./verkada/config";
import { viamApp } from "./viam/config";
import { zendeskApp } from "./zendesk/config";

export {
  awsIotApp,
  azureIotApp,
  bacnetApp,
  cisaKevApp,
  confluenceApp,
  dropboxApp,
  fhirApp,
  gmailApp,
  githubApp,
  googleCalendarApp,
  googleDriveApp,
  jiraApp,
  linearApp,
  microsoftCalendarApp,
  matterportApp,
  mitreAttackApp,
  mqttApp,
  noderedApp,
  notionApp,
  nvdApp,
  omniverseApp,
  opcuaApp,
  outlookApp,
  owaspApp,
  salesforceApp,
  samsaraApp,
  servicenowApp,
  sharePointApp,
  slackApp,
  smartThingsApp,
  teamsApp,
  thingsboardApp,
  verkadaApp,
  viamApp,
  zendeskApp,
};

export type {
  AtlassianOAuthResult,
  AtlassianSite,
} from "./atlassian";
export {
  AtlassianOAuthError,
  exchangeAtlassianCode,
  fetchAccessibleResources,
  fetchAtlassianUserInfo,
  generateAtlassianAuthUrl,
  refreshAtlassianToken,
} from "./atlassian";
export type {
  ConfluenceOAuthResult,
  ExchangeConfluenceCodeParams,
  GenerateConfluenceAuthUrlParams,
  RefreshConfluenceTokenParams,
} from "./confluence/oauth";
export {
  exchangeConfluenceCode,
  generateConfluenceAuthUrl,
  refreshConfluenceToken,
} from "./confluence/oauth";
export type {
  DropboxAccountInfo,
  DropboxOAuthResult,
  DropboxTokenResponse,
  ExchangeDropboxCodeParams,
  GenerateDropboxAuthUrlParams,
  RefreshDropboxTokenParams,
  RefreshDropboxTokenResult,
} from "./dropbox";
export {
  DROPBOX_TOKEN_LIFETIME_SECONDS,
  DropboxOAuthError,
  exchangeDropboxCode,
  generateDropboxAuthUrl,
  refreshDropboxToken,
} from "./dropbox";
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
export type {
  ExchangeGoogleCalendarCodeParams,
  GenerateGoogleCalendarAuthUrlParams,
  GoogleCalendarOAuthResult,
  RefreshGoogleCalendarTokenParams,
} from "./google-calendar/oauth";
export {
  exchangeGoogleCalendarCode,
  generateGoogleCalendarAuthUrl,
  refreshGoogleCalendarToken,
} from "./google-calendar/oauth";
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
export type {
  ExchangeJiraCodeParams,
  GenerateJiraAuthUrlParams,
  JiraOAuthResult,
  RefreshJiraTokenParams,
} from "./jira/oauth";
export {
  exchangeJiraCode,
  generateJiraAuthUrl,
  refreshJiraToken,
} from "./jira/oauth";

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
export { appLogos, connectorLogos } from "./logos";
export type {
  ExchangeMicrosoftCalendarCodeParams,
  GenerateMicrosoftCalendarAuthUrlParams,
  MicrosoftCalendarOAuthResult,
  RefreshMicrosoftCalendarTokenParams,
} from "./microsoft-calendar/oauth";
export {
  exchangeMicrosoftCalendarCode,
  generateMicrosoftCalendarAuthUrl,
  refreshMicrosoftCalendarToken,
} from "./microsoft-calendar/oauth";
export { exchangeNotionCode, generateNotionAuthUrl } from "./notion/oauth";
export type { NotionAuthResult, NotionOAuthResponse } from "./notion/types";
export type {
  ExchangeOutlookCodeParams,
  GenerateOutlookAuthUrlParams,
  OutlookOAuthResult,
  RefreshOutlookTokenParams,
} from "./outlook/oauth";
export {
  exchangeOutlookCode,
  generateOutlookAuthUrl,
  refreshOutlookToken,
} from "./outlook/oauth";
export type {
  ExchangeSalesforceCodeParams,
  GenerateSalesforceAuthUrlParams,
  RefreshSalesforceTokenParams,
  RefreshSalesforceTokenResult,
  SalesforceOAuthResult,
} from "./salesforce";
export {
  exchangeSalesforceCode,
  generateSalesforceAuthUrl,
  refreshSalesforceToken,
  SALESFORCE_TOKEN_LIFETIME_SECONDS,
  SalesforceOAuthError,
} from "./salesforce";
export {
  createSecretRef,
  isSecretRef,
  resolveSecret,
  SecretResolutionError,
} from "./secrets";
export type {
  ExchangeServiceNowCodeParams,
  GenerateServiceNowAuthUrlParams,
  RefreshServiceNowTokenParams,
  RefreshServiceNowTokenResult,
  ServiceNowOAuthResult,
} from "./servicenow";
export {
  exchangeServiceNowCode,
  generateServiceNowAuthUrl,
  refreshServiceNowToken,
  ServiceNowOAuthError,
} from "./servicenow";
export type {
  ExchangeSharePointCodeParams,
  GenerateSharePointAuthUrlParams,
  RefreshSharePointTokenParams,
  SharePointOAuthResult,
} from "./sharepoint/oauth";
export {
  exchangeSharePointCode,
  generateSharePointAuthUrl,
  refreshSharePointToken,
} from "./sharepoint/oauth";
export * from "./slack/oauth";
export * from "./slack/types";
export type {
  ExchangeTeamsCodeParams,
  GenerateTeamsAuthUrlParams,
  RefreshTeamsTokenParams,
  TeamsOAuthResult,
} from "./teams/oauth";
export {
  exchangeTeamsCode,
  generateTeamsAuthUrl,
  refreshTeamsToken,
} from "./teams/oauth";
export * from "./types";
export type {
  ExchangeZendeskCodeParams,
  GenerateZendeskAuthUrlParams,
  ZendeskOAuthResult,
} from "./zendesk";
export {
  exchangeZendeskCode,
  generateZendeskAuthUrl,
  ZendeskOAuthError,
} from "./zendesk";

export const appStore: UnifiedApp[] = [
  gmailApp,
  githubApp,
  googleDriveApp,
  linearApp,
  notionApp,
  samsaraApp,
  verkadaApp,
  awsIotApp,
  azureIotApp,
  smartThingsApp,
  slackApp,
  mqttApp,
  opcuaApp,
  bacnetApp,
  thingsboardApp,
  noderedApp,
  omniverseApp,
  matterportApp,
  viamApp,
  fhirApp,
  nvdApp,
  cisaKevApp,
  mitreAttackApp,
  owaspApp,
  outlookApp,
  sharePointApp,
  teamsApp,
  confluenceApp,
  jiraApp,
  dropboxApp,
  salesforceApp,
  servicenowApp,
  zendeskApp,
  googleCalendarApp,
  microsoftCalendarApp,
];
