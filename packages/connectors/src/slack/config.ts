/**
 * Slack Connector Configuration
 */

import type { OAuthConfig } from "../oauth";
import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

/**
 * Slack OAuth Configuration
 */
export const slackOAuthConfig: OAuthConfig = {
  authUrl: "https://slack.com/oauth/v2/authorize",
  tokenUrl: "https://slack.com/api/oauth.v2.access",
  scopeDelimiter: ",", // Slack uses comma-separated scopes
  scopes: [
    "channels:read",
    "channels:history",
    "groups:read",
    "groups:history",
    "im:read",
    "im:history",
    "mpim:read",
    "mpim:history",
    "users:read",
    "users:read.email",
    "team:read",
    "chat:write",
    "files:read",
  ],
};

/**
 * Full Slack App Configuration
 */
export const slackApp: UnifiedApp = {
  id: AppType.SLACK,
  name: "Slack",
  category: "Communication",
  active: true,
  logo: AppType.SLACK,
  short_description: "Search across messages, channels, and users.",
  description:
    "Connect your Slack workspace to enable AI-powered search across all your team's conversations, files, and knowledge. OpenPlane indexes your data securely and respects all privacy controls you configure.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Slack Technologies, LLC",
  website: "https://slack.com",

  features: [
    "Semantic search across all messages and threads",
    "AI-powered answers directly in Slack",
    "Real-time indexing with instant search results",
    "Automatic identity mapping for @mentions",
    "File and attachment search",
    "Configurable privacy controls per channel type",
  ],

  auth: {
    type: AuthType.OAUTH2,
    config: {
      authUrl: slackOAuthConfig.authUrl,
      tokenUrl: slackOAuthConfig.tokenUrl,
      scopes: slackOAuthConfig.scopes,
      redirectPath: "/connectors/oauth/slack/callback",
      scopeDetails: [
        {
          name: "channels:read",
          description: "View basic information about public channels",
        },
        {
          name: "channels:history",
          description: "View messages in public channels",
        },
        {
          name: "groups:read",
          description: "View basic information about private channels",
        },
        {
          name: "groups:history",
          description: "View messages in private channels",
        },
        { name: "users:read", description: "View people in a workspace" },
        { name: "users:read.email", description: "View email addresses" },
        { name: "files:read", description: "View files shared in channels" },
        { name: "chat:write", description: "Send messages as the bot" },
      ],
    },
  },

  streams: [
    {
      name: "users",
      label: "Team Members",
      description: "User profiles for identity mapping",
      entityType: "identity",
      dataPoints: ["Display Name", "Email", "Profile Photo", "Status"],
      isPii: true,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
    {
      name: "channels",
      label: "Channels",
      description: "Channel metadata and structure",
      entityType: "resource",
      dataPoints: ["Name", "Topic", "Description", "Members"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 30,
      supportsBackfill: true,
    },
    {
      name: "messages",
      label: "Messages & Threads",
      description: "Conversation history from channels",
      entityType: "activity",
      dataPoints: ["Content", "Author", "Timestamp", "Replies", "Reactions"],
      syncMode: SyncMode.REALTIME,
      supportsBackfill: true,
    },
    {
      name: "files",
      label: "Files & Attachments",
      description: "Shared documents and media",
      entityType: "resource",
      dataPoints: ["Name", "Type", "URL", "Uploaded By"],
      syncMode: SyncMode.REALTIME,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "index_private_channels",
      label: "Index Private Channels",
      description: "Allow indexing of private channels where the bot is added.",
      type: "switch",
      required: false,
      value: false,
    },
    {
      id: "index_dms",
      label: "Index Direct Messages",
      description: "Allow indexing of DMs where the bot is explicitly invited.",
      type: "switch",
      required: false,
      value: false,
    },
    {
      id: "bot_enabled",
      label: "Enable OpenPlane Bot",
      description: "Allow the bot to respond to questions in channels.",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "sync_mode",
      label: "Sync Strategy",
      description: "How OpenPlane accesses data.",
      type: "select",
      required: true,
      value: "realtime",
      options: [
        { label: "Real-time Indexing (Recommended)", value: "realtime" },
        { label: "Federated Search (No Storage)", value: "federated" },
      ],
    },
  ],
};

export default slackApp;
