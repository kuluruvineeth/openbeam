/**
 * @openplane/connectors
 *
 * Single source of truth for all connector/integration logic:
 * - OAuth flows
 * - Connector configurations
 * - Type definitions
 * - Sync utilities
 *
 * Usage:
 *   import { slackApp, generateSlackAuthUrl } from "@openplane/connectors/slack"
 *   import { googleDriveApp, exchangeGoogleCode } from "@openplane/connectors/google"
 *   import { generateStateToken } from "@openplane/connectors/oauth"
 *   import { connectorRegistry, getAllConnectors } from "@openplane/connectors"
 */

// ============================================================================
// Shared OAuth Utilities
// ============================================================================
export * from "./oauth";
// ============================================================================
// Connector Registry
// ============================================================================
export {
  type ConnectorOAuthMeta,
  connectorRegistry,
  getAllConnectors,
  getConnector,
  getConnectorOAuthMeta,
  getConnectorsByCategory,
  isConnectorAvailable,
} from "./registry";
// ============================================================================
// Core Types
// ============================================================================
export * from "./types";

// ============================================================================
// Individual Connectors (re-export for convenience)
// ============================================================================

// Google
export { googleDriveApp, googleOAuthConfig } from "./google/config";
export {
  exchangeGoogleCode,
  type GoogleAuthResult,
  generateGoogleAuthUrl,
  getGoogleCredentials,
  refreshGoogleToken,
} from "./google/oauth";
// Slack
export { slackApp, slackOAuthConfig } from "./slack/config";
export {
  exchangeSlackCode,
  generateSlackAuthUrl,
  getSlackCredentials,
  type SlackAuthResult,
} from "./slack/oauth";

import { googleDriveApp } from "./google/config";
// ============================================================================
// Legacy Exports (for backwards compatibility)
// ============================================================================
import { slackApp } from "./slack/config";
import type { UnifiedApp } from "./types";

/** @deprecated Use connectorRegistry or getAllConnectors() instead */
export const appStore: UnifiedApp[] = [slackApp, googleDriveApp];
