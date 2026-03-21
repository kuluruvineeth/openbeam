import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const teamsApp: UnifiedApp = {
  id: AppType.MICROSOFT_TEAMS,
  name: "Microsoft Teams",
  category: "Communication",
  active: true,
  logo: AppType.MICROSOFT_TEAMS,
  short_description: "Search across Teams channels, messages, and chats.",
  description:
    "Connect Microsoft Teams to search across channel messages and conversations via Microsoft Graph API. Supports OAuth for organizational accounts.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Microsoft Corporation",
  website: "https://www.microsoft.com/microsoft-teams",

  searchDisplay: {
    defaultIconKey: "MessageCircle",
    documentTypes: {
      message: {
        label: "message",
        iconKey: "MessageCircle",
        category: "message",
      },
    },
  },

  features: [
    "Semantic search across channel messages",
    "Delta sync for incremental updates",
    "Team and channel discovery",
  ],

  auth: {
    type: AuthType.OAUTH2,
    config: {
      authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
      tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      redirectPath: "/connectors/setup/teams/oauth/callback",
      scopes: [
        "ChannelMessage.Read.All",
        "Team.ReadBasic.All",
        "Channel.ReadBasic.All",
        "User.Read",
        "offline_access",
      ],
    },
  },

  streams: [
    {
      name: "messages",
      label: "Messages",
      description: "Channel messages and conversations",
      entityType: "activity",
      dataPoints: ["Content", "Sender", "Channel", "Team", "Date"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "oauth_input_method",
      label: "Credentials",
      description: "Enter Azure AD app credentials.",
      type: "select",
      required: true,
      value: "manual",
      options: [{ label: "Enter manually", value: "manual" }],
    },
    {
      id: "client_id",
      label: "Application (client) ID",
      description: "From Azure AD app registration",
      type: "text",
      required: true,
      value: "",
      placeholder: "00000000-0000-0000-0000-000000000000",
    },
    {
      id: "client_secret",
      label: "Client Secret",
      description: "From Azure AD app registration → Certificates & secrets",
      type: "password",
      required: true,
      value: "",
    },
    {
      id: "tenant_id",
      label: "Tenant ID",
      description: "Azure AD tenant. Leave 'common' for multi-tenant.",
      type: "text",
      required: false,
      value: "common",
      placeholder: "common",
    },
    {
      id: "include_teams",
      label: "Include Teams",
      description: "Only sync these teams. Leave empty for all joined teams.",
      type: "text",
      required: false,
      value: "",
      placeholder: "Engineering, Product",
    },
    {
      id: "exclude_teams",
      label: "Exclude Teams",
      description: "Skip these teams.",
      type: "text",
      required: false,
      value: "",
      placeholder: "Social, Random",
    },
    {
      id: "sync_replies",
      label: "Sync Replies",
      description: "Index thread replies in addition to top-level messages.",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "sync_private_channels",
      label: "Sync Private Channels",
      description:
        "Include private channels the authenticated user has access to.",
      type: "switch",
      required: false,
      value: false,
    },
    {
      id: "lookback_days",
      label: "History (days)",
      description: "How far back to sync messages. Leave empty for unlimited.",
      type: "text",
      required: false,
      value: "",
      placeholder: "Unlimited",
    },
    {
      id: "sync_files",
      label: "Sync Files",
      description: "Index files shared in channels.",
      type: "switch",
      required: false,
      value: false,
    },
    {
      id: "sync_meeting_notes",
      label: "Sync Meeting Notes",
      description: "Index meeting transcripts and notes.",
      type: "switch",
      required: false,
      value: false,
    },
  ],
};

export default teamsApp;
