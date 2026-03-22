import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const zoomApp: UnifiedApp = {
  id: AppType.ZOOM,
  name: "Zoom",
  category: "Communication",
  active: true,
  logo: AppType.ZOOM,
  short_description:
    "Search across meeting recordings, transcripts, and past meetings.",
  description:
    "Connect Zoom to index cloud recordings, transcripts, and past meeting metadata. OpenBeam makes your meeting content searchable so teams can find decisions, action items, and discussions without watching full recordings.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Zoom Video Communications, Inc.",
  website: "https://zoom.us",

  searchDisplay: {
    defaultIconKey: "Video",
    documentTypes: {
      meeting: { label: "meeting", iconKey: "Video", category: "meeting" },
      recording: {
        label: "recording",
        iconKey: "Video",
        category: "recording",
      },
      transcript: {
        label: "transcript",
        iconKey: "FileText",
        category: "transcript",
      },
    },
  },

  features: [
    "Search across meeting recordings and transcripts",
    "Full-text search on VTT transcript content",
    "Meeting metadata: topic, duration, participants, host",
    "Cloud recording playback URLs for quick access",
    "Configurable lookback window for historical sync",
    "Filter by recording type and user",
  ],

  auth: {
    type: AuthType.OAUTH2,
    config: {
      authUrl: "https://zoom.us/oauth/authorize",
      tokenUrl: "https://zoom.us/oauth/token",
      redirectPath: "/connectors/setup/zoom/oauth/callback",
      scopes: [
        "user:read:list_users:admin",
        "user:read:user:admin",
        "meeting:read:list_past_meetings:admin",
        "meeting:read:meeting:admin",
        "cloud_recording:read:list_recording_files:admin",
        "cloud_recording:read:list_user_recordings:admin",
      ],
    },
  },

  streams: [
    {
      name: "meetings",
      label: "Past Meetings",
      description:
        "Meeting metadata including topic, duration, host, and participants count",
      entityType: "activity",
      dataPoints: [
        "Topic",
        "Start Time",
        "Duration",
        "Host",
        "Participants Count",
        "Agenda",
      ],
      isPii: true,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
    {
      name: "recordings",
      label: "Cloud Recordings",
      description: "Cloud recording files with play and download URLs",
      entityType: "resource",
      dataPoints: [
        "Topic",
        "File Type",
        "Duration",
        "Recording Type",
        "Share URL",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
    {
      name: "transcripts",
      label: "Transcripts",
      description:
        "VTT transcript text from cloud recordings for full-text search",
      entityType: "resource",
      dataPoints: ["Transcript Content", "Recording Topic", "Start Time"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "client_id",
      label: "Client ID",
      description: "Your Zoom OAuth App Client ID",
      type: "text",
      required: true,
      value: "",
    },
    {
      id: "client_secret",
      label: "Client Secret",
      description: "Your Zoom OAuth App Client Secret",
      type: "text",
      required: true,
      value: "",
    },
    {
      id: "sync_recordings",
      label: "Sync Cloud Recordings",
      description: "Index cloud recording metadata and playback URLs",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "sync_transcripts",
      label: "Sync Transcripts",
      description:
        "Download and index VTT transcript text from cloud recordings",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "sync_past_meetings",
      label: "Sync Past Meetings",
      description: "Index past meeting metadata (topic, duration, host)",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "lookback_days",
      label: "Lookback Days",
      description:
        "How far back to sync meetings and recordings (default: 90 days)",
      type: "text",
      required: false,
      value: "90",
      placeholder: "90",
    },
    {
      id: "include_users",
      label: "Include Users",
      description:
        "Only sync meetings for these user emails (comma-separated). Leave empty to sync all users.",
      type: "text",
      required: false,
      value: "",
      placeholder: "alice@company.com, bob@company.com",
    },
    {
      id: "exclude_users",
      label: "Exclude Users",
      description: "Exclude meetings from these user emails (comma-separated)",
      type: "text",
      required: false,
      value: "",
      placeholder: "noreply@company.com",
    },
    {
      id: "recording_types_filter",
      label: "Recording Types Filter",
      description:
        "Only index recordings of these types (comma-separated). Leave empty for all types.",
      type: "text",
      required: false,
      value: "",
      placeholder:
        "shared_screen_with_speaker_view, audio_only, active_speaker",
    },
  ],
};

export default zoomApp;
