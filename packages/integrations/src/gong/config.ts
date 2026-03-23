import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const gongApp: UnifiedApp = {
  id: AppType.GONG,
  name: "Gong",
  category: "Sales Intelligence",
  active: true,
  logo: AppType.GONG,
  short_description:
    "Search across sales calls, transcripts, and conversation intelligence from Gong.",
  description:
    "Connect Gong to index and search call recordings, transcripts, and participant metadata. Supports incremental sync via date range filters and full-text search across conversation content.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Gong.io",
  website: "https://www.gong.io/",
  searchDisplay: {
    defaultIconKey: "PhoneIcon",
    documentTypes: {
      call: {
        label: "call",
        iconKey: "PhoneIcon",
        category: "recording",
      },
      transcript: {
        label: "transcript",
        iconKey: "FileTextIcon",
        category: "document",
      },
    },
  },

  features: [
    "Call metadata and recording search",
    "Full transcript indexing with speaker attribution",
    "Participant and attendee search",
    "Date-range incremental sync",
    "Call direction filtering (inbound/outbound)",
  ],

  auth: {
    type: AuthType.API_KEY,
    config: {
      headerName: "Authorization",
      documentationUrl: "https://help.gong.io/docs/receive-access-to-the-api",
    },
  },

  streams: [
    {
      name: "calls",
      label: "Calls",
      description: "Sales calls with metadata, participants, and duration",
      entityType: "activity",
      dataPoints: [
        "Title",
        "Started",
        "Duration",
        "Direction",
        "Parties",
        "Disposition",
        "Purpose",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
    {
      name: "transcripts",
      label: "Transcripts",
      description:
        "Full call transcripts with speaker attribution and timestamps",
      entityType: "resource",
      dataPoints: ["Speaker", "Timestamp", "Text", "CallId"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "access_key",
      label: "Gong Access Key",
      description: "API access key from Gong admin settings",
      type: "text",
      required: true,
      value: "",
      placeholder: "Your Gong access key",
    },
    {
      id: "access_key_secret",
      label: "Gong Access Key Secret",
      description: "API access key secret paired with the access key",
      type: "password",
      required: true,
      value: "",
      placeholder: "Secret key",
    },
    {
      id: "sync_transcripts",
      label: "Sync Transcripts",
      description: "Index full call transcripts (may increase sync time)",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "lookback_days",
      label: "Lookback Days",
      description: "Only sync calls from the last N days. Default 90.",
      type: "number",
      required: false,
      value: 90,
    },
    {
      id: "call_direction_filter",
      label: "Call Direction Filter",
      description:
        "Filter calls by direction. Leave empty for all. Options: Inbound, Outbound",
      type: "text",
      required: false,
      value: "",
      placeholder: "Inbound or Outbound",
    },
  ],
};

export default gongApp;
