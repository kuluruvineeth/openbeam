import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const microsoftCalendarApp: UnifiedApp = {
  id: AppType.MICROSOFT_CALENDAR,
  name: "Microsoft Calendar",
  category: "Productivity",
  active: true,
  logo: AppType.MICROSOFT_CALENDAR,
  short_description: "Search across calendar events, meetings, and schedules.",
  description:
    "Connect Microsoft Calendar (Outlook Calendar) to search across events, meetings, and schedules via Microsoft Graph API. Supports delta sync for efficient incremental updates.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Microsoft Corporation",
  website: "https://outlook.live.com/calendar",

  searchDisplay: {
    defaultIconKey: "Calendar",
    documentTypes: {
      event: { label: "event", iconKey: "Calendar", category: "event" },
    },
  },

  features: [
    "Semantic search across calendar events",
    "Delta sync for efficient incremental updates",
    "Cancelled event detection and removal",
  ],

  auth: {
    type: AuthType.OAUTH2,
    config: {
      authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
      tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      redirectPath: "/connectors/setup/microsoft-calendar/oauth/callback",
      scopes: ["Calendars.Read", "User.Read", "offline_access"],
    },
  },

  streams: [
    {
      name: "events",
      label: "Calendar Events",
      description: "Meetings, appointments, and scheduled events",
      entityType: "activity",
      dataPoints: [
        "Subject",
        "Body",
        "Location",
        "Start",
        "End",
        "Attendees",
        "Organizer",
      ],
      isPii: true,
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
      id: "lookback_days",
      label: "History (days)",
      description:
        "How far back to sync events. Leave empty for 90 days default.",
      type: "text",
      required: false,
      value: "90",
      placeholder: "90",
    },
  ],
};

export default microsoftCalendarApp;
