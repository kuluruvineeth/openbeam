/**
 * Connector Registry
 * Central registry of all available connectors
 */

import { googleDriveApp } from "./google/config";
import { slackApp } from "./slack/config";
import type { UnifiedApp } from "./types";

/**
 * All available connectors
 */
export const connectorRegistry: Record<string, UnifiedApp> = {
  slack: slackApp,
  google: googleDriveApp,
  // Add more connectors here as they're implemented
};

/**
 * Get connector by ID
 */
export function getConnector(id: string): UnifiedApp | null {
  return connectorRegistry[id.toLowerCase()] || null;
}

/**
 * Get all connectors
 */
export function getAllConnectors(): UnifiedApp[] {
  return Object.values(connectorRegistry);
}

/**
 * Get connectors by category
 */
export function getConnectorsByCategory(category: string): UnifiedApp[] {
  return Object.values(connectorRegistry).filter(
    (c) => c.category.toLowerCase() === category.toLowerCase()
  );
}

/**
 * Check if a connector is available
 */
export function isConnectorAvailable(id: string): boolean {
  return id.toLowerCase() in connectorRegistry;
}

/**
 * Connector metadata for OAuth routing
 */
export type ConnectorOAuthMeta = {
  id: string;
  name: string;
  envClientId: string;
  envClientSecret: string;
  hasCredentials: boolean;
};

/**
 * Get OAuth metadata for all connectors
 */
export function getConnectorOAuthMeta(): ConnectorOAuthMeta[] {
  const envMappings: Record<
    string,
    { clientId: string; clientSecret: string }
  > = {
    slack: { clientId: "SLACK_CLIENT_ID", clientSecret: "SLACK_CLIENT_SECRET" },
    google: {
      clientId: "GOOGLE_CLIENT_ID",
      clientSecret: "GOOGLE_CLIENT_SECRET",
    },
    notion: {
      clientId: "NOTION_CLIENT_ID",
      clientSecret: "NOTION_CLIENT_SECRET",
    },
    github: {
      clientId: "GITHUB_CLIENT_ID",
      clientSecret: "GITHUB_CLIENT_SECRET",
    },
    microsoft: {
      clientId: "MICROSOFT_CLIENT_ID",
      clientSecret: "MICROSOFT_CLIENT_SECRET",
    },
    confluence: {
      clientId: "ATLASSIAN_CLIENT_ID",
      clientSecret: "ATLASSIAN_CLIENT_SECRET",
    },
    jira: {
      clientId: "ATLASSIAN_CLIENT_ID",
      clientSecret: "ATLASSIAN_CLIENT_SECRET",
    },
    dropbox: {
      clientId: "DROPBOX_CLIENT_ID",
      clientSecret: "DROPBOX_CLIENT_SECRET",
    },
    linear: {
      clientId: "LINEAR_CLIENT_ID",
      clientSecret: "LINEAR_CLIENT_SECRET",
    },
    asana: { clientId: "ASANA_CLIENT_ID", clientSecret: "ASANA_CLIENT_SECRET" },
  };

  return Object.entries(connectorRegistry).map(([id, connector]) => {
    const env = envMappings[id] || { clientId: "", clientSecret: "" };
    return {
      id,
      name: connector.name,
      envClientId: env.clientId,
      envClientSecret: env.clientSecret,
      hasCredentials: Boolean(
        process.env[env.clientId] && process.env[env.clientSecret]
      ),
    };
  });
}
