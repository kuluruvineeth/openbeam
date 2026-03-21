import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const googleCalendarApp: UnifiedApp = {
  id: AppType.GOOGLE_CALENDAR,
  name: "Google Calendar",
  category: "Productivity",
  active: true,
  logo: AppType.GOOGLE_CALENDAR,
  short_description: "Search across calendar events, meetings, and schedules.",
  description:
    "Connect Google Calendar to search across events, meetings, and schedules. Supports OAuth 2.0 with syncToken-based incremental sync for efficient delta updates.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Google LLC",
  website: "https://calendar.google.com",

  searchDisplay: {
    defaultIconKey: "Calendar",
    documentTypes: {
      event: { label: "event", iconKey: "Calendar", category: "event" },
    },
  },

  features: [
    "Semantic search across calendar events",
    "SyncToken-based incremental sync for efficient updates",
    "Cancelled event detection and removal",
  ],

  auth: {
    type: AuthType.OAUTH2,
    config: {
      authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      redirectPath: "/connectors/setup/google-calendar/oauth/callback",
      scopes: [
        "https://www.googleapis.com/auth/calendar.readonly",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
      ],
    },
  },

  streams: [
    {
      name: "events",
      label: "Calendar Events",
      description: "Meetings, appointments, and scheduled events",
      entityType: "activity",
      dataPoints: [
        "Title",
        "Description",
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
      description: "Enter Google Cloud OAuth credentials.",
      type: "select",
      required: true,
      value: "manual",
      options: [{ label: "Enter manually", value: "manual" }],
    },
    {
      id: "client_id",
      label: "Client ID",
      description: "From Google Cloud Console → APIs & Services → Credentials",
      type: "text",
      required: true,
      value: "",
      placeholder: "xxxx.apps.googleusercontent.com",
    },
    {
      id: "client_secret",
      label: "Client Secret",
      description: "From Google Cloud Console",
      type: "password",
      required: true,
      value: "",
    },
    {
      id: "include_calendars",
      label: "Include Calendars",
      description:
        "Only sync these calendar IDs. Leave empty for all calendars.",
      type: "text",
      required: false,
      value: "",
      placeholder: "primary, team@group.calendar.google.com",
    },
    {
      id: "lookback_days",
      label: "History (days)",
      description: "How far back to sync events. Leave empty for unlimited.",
      type: "text",
      required: false,
      value: "90",
      placeholder: "90",
    },
  ],
};

export default googleCalendarApp;
