import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const fellowApp: UnifiedApp = {
  id: AppType.FELLOW,
  name: "Fellow",
  category: "Meetings & Notes",
  active: true,
  logo: AppType.FELLOW,
  short_description:
    "Search meetings, notes, action items, and streams from Fellow",
  description:
    "Connect Fellow to search across meeting management data including meetings with notes, action items, and streams. Supports API key authentication with cursor-based pagination and updated_after incremental sync.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Fellow Insights Inc.",
  website: "https://fellow.ai",

  searchDisplay: {
    defaultIconKey: "CalendarIcon",
    documentTypes: {
      meeting: {
        label: "meeting",
        iconKey: "CalendarIcon",
        category: "meeting",
      },
      action_item: {
        label: "action item",
        iconKey: "CheckSquareIcon",
        category: "task",
      },
      stream: {
        label: "stream",
        iconKey: "ListIcon",
        category: "channel",
      },
    },
  },

  features: [
    "Meeting search with notes, attendees, and timestamps",
    "Action item tracking with assignees and due dates",
    "Stream feeds with topic-based note organization",
    "Incremental sync via updated_after parameter",
  ],

  auth: {
    type: AuthType.API_KEY,
    config: {
      headerName: "X-API-KEY",
      documentationUrl: "https://developers.fellow.ai/reference/introduction",
    },
  },

  streams: [
    {
      name: "meetings",
      label: "Meetings",
      description:
        "Meetings with notes, attendees, timestamps, and agenda items",
      entityType: "activity",
      isPii: false,
      dataPoints: [
        "Title",
        "Notes",
        "Attendees",
        "Start Time",
        "End Time",
        "Created",
        "Updated",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "action_items",
      label: "Action Items",
      description:
        "Action items with assignees, due dates, status, and linked meetings",
      entityType: "activity",
      isPii: false,
      dataPoints: [
        "Title",
        "Assignee",
        "Due Date",
        "Status",
        "Meeting",
        "Created",
        "Updated",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "streams",
      label: "Streams",
      description: "Note streams organized by topic or team",
      entityType: "resource",
      isPii: false,
      dataPoints: ["Name", "Description", "Created", "Updated"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "subdomain",
      label: "Workspace Subdomain",
      description:
        "Your Fellow workspace subdomain (e.g. 'acme' from acme.fellow.app).",
      type: "text",
      required: true,
      value: "",
      placeholder: "acme",
    },
    {
      id: "api_key",
      label: "API Key",
      description:
        "Fellow API key. Generate from Fellow Settings > Integrations > API.",
      type: "password",
      required: true,
      value: "",
      placeholder: "Your Fellow API key",
    },
    {
      id: "lookback_days",
      label: "Lookback Days",
      description:
        "Number of days of history to sync on first run (0 = all time)",
      type: "text",
      required: false,
      value: "90",
      placeholder: "90",
    },
  ],
};

export default fellowApp;
