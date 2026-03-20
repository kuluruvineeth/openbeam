export { salesforceApp } from "./config";
export type {
  ExchangeSalesforceCodeParams,
  GenerateSalesforceAuthUrlParams,
  RefreshSalesforceTokenParams,
  RefreshSalesforceTokenResult,
} from "./oauth";
export {
  exchangeSalesforceCode,
  generateSalesforceAuthUrl,
  refreshSalesforceToken,
  SALESFORCE_TOKEN_LIFETIME_SECONDS,
  SalesforceOAuthError,
} from "./oauth";
export type {
  SalesforceOAuthResult,
  SalesforceTokenResponse,
  SalesforceUserInfo,
} from "./types";
