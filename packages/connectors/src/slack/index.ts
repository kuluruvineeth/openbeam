/**
 * Slack Connector
 * Single source of truth for all Slack integration logic
 */

// API Constants (shared with worker)
export * from "./api";
// Configuration
export { slackApp, slackOAuthConfig } from "./config";
// Constants
export * from "./constants";
// OAuth
export {
  type ExchangeSlackCodeParams,
  exchangeSlackCode,
  type GenerateSlackAuthUrlParams,
  generateSlackAuthUrl,
  generateStateToken,
  getSlackCredentials,
  type SlackAuthResult,
} from "./oauth";
// Types
export * from "./types";
