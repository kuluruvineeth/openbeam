import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const slackApp: UnifiedApp = {
  id: AppType.SLACK,
  name: "Slack",
  category: "Communication",
  active: true,
  logo: AppType.SLACK,
  short_description: "Search across messages, channels, and users.",
  description:
    "Connect your Slack workspace to OpenPlane to make your team's conversations searchable. We index public channels, user profiles, and shared files. OpenPlane respects Slack's privacy policies and only accesses data you explicitly authorize.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Slack Technologies, LLC",
  website: "https://slack.com",

  features: [
    "Full-text search for public messages",
    "Private channel search (requires bot invitation)",
    "Direct message indexing (opt-in)",
    "User identity mapping",
    "Channel directory syncing",
    "AI-powered answers in Slack (OpenPlane Bot)",
  ],

  auth: {
    type: AuthType.OAUTH2,
    config: {
      authUrl: "https://slack.com/oauth/v2/authorize",
      tokenUrl: "https://slack.com/api/oauth.v2.access",
      // Default scopes - can be overridden by user configuration if needed
      scopes: [
        "channels:read", // Public channels
        "groups:read", // Private channels
        "im:read", // DMs
        "mpim:read", // Group DMs
        "users:read", // Users
        "users:read.email", // User emails
        "team:read", // Workspace info
        "chat:write", // Bot responses
        "files:read", // Files
        "search:read", // Search (if federated)
      ],
      scopeDetails: [
        {
          name: "channels:read",
          description:
            "View basic information about public channels in a workspace",
        },
        {
          name: "groups:read",
          description:
            "View basic information about private channels that OpenPlane has been added to",
        },
        {
          name: "im:read",
          description:
            "View basic information about direct messages that OpenPlane has been added to",
        },
        {
          name: "mpim:read",
          description:
            "View basic information about group direct messages that OpenPlane has been added to",
        },
        { name: "users:read", description: "View people in a workspace" },
        {
          name: "users:read.email",
          description:
            "View email addresses of people in a workspace (for identity mapping)",
        },
        {
          name: "team:read",
          description: "View the name, email domain, and icon for a workspace",
        },
        {
          name: "files:read",
          description: "View files shared in channels and conversations",
        },
        {
          name: "chat:write",
          description:
            "Post messages to channels on your behalf (only when you explicitly send a message)",
        },
      ],
    },
  },

  streams: [
    {
      name: "users",
      label: "Users",
      description: "Workspace members and their profiles",
      entityType: "identity",
      dataPoints: ["Name", "Email", "Avatar", "Timezone", "Job Title"],
      isPii: true,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60, // Sync users every hour
      supportsBackfill: true,
    },
    {
      name: "channels",
      label: "Public Channels",
      description: "Public channels in the workspace",
      entityType: "resource",
      dataPoints: ["Channel Name", "Topic", "Description", "Member Count"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 30, // Sync channel list every 30 mins
      supportsBackfill: true,
    },
    {
      name: "messages",
      label: "Messages",
      description: "History of messages in public channels",
      entityType: "activity",
      dataPoints: [
        "Message Content",
        "Author",
        "Timestamp",
        "Thread Replies",
        "Reactions",
      ],
      syncMode: SyncMode.REALTIME, // Slack Events API
      supportsBackfill: true, // History API
    },
    {
      name: "files",
      label: "Files",
      description: "Shared files and documents",
      entityType: "resource",
      dataPoints: ["File Name", "File Type", "Download URL", "Author"],
      syncMode: SyncMode.REALTIME,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "client_id",
      label: "Client ID",
      description: "Your Slack App Client ID",
      type: "text",
      required: true,
      value: "",
    },
    {
      id: "client_secret",
      label: "Client Secret",
      description: "Your Slack App Client Secret",
      type: "text",
      required: true,
      value: "",
    },
    {
      id: "signing_secret",
      label: "Signing Secret",
      description: "Your Slack App Signing Secret (for verifying requests)",
      type: "text",
      required: true,
      value: "",
    },
    {
      id: "index_private_channels",
      label: "Index Private Channels",
      description:
        "Allow OpenPlane to index messages in private channels where the OpenPlane bot is added.",
      type: "switch",
      required: false,
      value: false,
    },
    {
      id: "index_dms",
      label: "Index Direct Messages",
      description:
        "Allow indexing of Direct Messages (DMs) where the OpenPlane bot is added. Users must explicitly invite the bot.",
      type: "switch",
      required: false,
      value: false,
    },
    {
      id: "bot_enabled",
      label: "Enable OpenPlane Bot",
      description:
        "Allow the OpenPlane bot to respond to questions directly in Slack channels.",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "sync_mode",
      label: "Sync Strategy",
      description:
        "Choose how OpenPlane accesses data. 'Real-time' uses events (faster). 'Federated' uses Slack Search API (no storage, slower).",
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
