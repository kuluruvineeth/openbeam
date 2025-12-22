import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const googleDriveApp: UnifiedApp = {
  id: AppType.GOOGLE_DRIVE,
  name: "Google Drive",
  category: "Documents & Storage",
  active: true,
  logo: AppType.GOOGLE_DRIVE,
  short_description: "Search across files, folders, and shared drives.",
  description:
    "Connect Google Drive to search across documents, spreadsheets, presentations, and other files. Supports OAuth for personal accounts and Service Account for Google Workspace.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Google LLC",
  website: "https://drive.google.com",

  searchDisplay: {
    defaultIconKey: "FileTextIcon",
    documentTypes: {
      file: { label: "file", iconKey: "FileTextIcon", category: "file" },
      folder: { label: "folder", iconKey: "Folder", category: "folder" },
      document: { label: "doc", iconKey: "FileTextIcon", category: "document" },
      spreadsheet: {
        label: "sheet",
        iconKey: "FileSpreadsheetIcon",
        category: "spreadsheet",
      },
      presentation: {
        label: "slides",
        iconKey: "PresentationIcon",
        category: "presentation",
      },
      image: { label: "image", iconKey: "FileImageIcon", category: "image" },
    },
    mimeTypes: {
      "application/vnd.google-apps.folder": {
        label: "folder",
        iconKey: "Folder",
        category: "folder",
      },
      "application/vnd.google-apps.document": {
        label: "doc",
        iconKey: "FileTextIcon",
        category: "document",
      },
      "application/vnd.google-apps.spreadsheet": {
        label: "sheet",
        iconKey: "FileSpreadsheetIcon",
        category: "spreadsheet",
      },
      "application/vnd.google-apps.presentation": {
        label: "slides",
        iconKey: "PresentationIcon",
        category: "presentation",
      },
      "application/pdf": {
        label: "pdf",
        iconKey: "FileTextIcon",
        category: "document",
      },
      "image/": { label: "image", iconKey: "FileImageIcon", category: "image" },
    },
  },

  features: [
    "Semantic search across all file types",
    "Document content extraction (Google Docs, PDFs, Office files)",
    "Shared Drive support for Google Workspace",
    "Permission-aware indexing with access control",
    "Real-time push notifications via Drive webhooks",
    "Video/audio transcription via TwelveLabs",
    "OAuth for personal accounts",
    "Domain-wide delegation for Google Workspace",
    "Federated search option for real-time queries",
  ],

  auth: {
    type: AuthType.OAUTH2,
    config: {
      authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      redirectPath: "/connectors/setup/google-drive/oauth/callback",
      scopes: [
        "https://www.googleapis.com/auth/drive.readonly",
        "https://www.googleapis.com/auth/drive.metadata.readonly",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
      ],
    },
  },

  streams: [
    {
      name: "files",
      label: "Files",
      description: "Documents, spreadsheets, presentations, and other files",
      entityType: "resource",
      dataPoints: [
        "Name",
        "Content",
        "Type",
        "Size",
        "Owner",
        "Modified",
        "Created",
      ],
      isPii: true,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "folders",
      label: "Folders",
      description: "Folder structure and hierarchy",
      entityType: "resource",
      dataPoints: ["Name", "Path", "Parent"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
    {
      name: "shared_drives",
      label: "Shared Drives",
      description: "Team shared drives (Workspace only)",
      entityType: "resource",
      dataPoints: ["Name", "Members"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
  ],

  settings: [
    // Auth method selector
    {
      id: "auth_method",
      label: "Authentication",
      description:
        "OAuth for personal accounts, Service Account for Workspace.",
      type: "select",
      required: true,
      value: "oauth",
      options: [
        { label: "OAuth 2.0", value: "oauth" },
        { label: "Service Account", value: "service_account" },
      ],
    },

    // OAuth settings
    {
      id: "oauth_input_method",
      label: "Credentials",
      description: "Upload JSON from Google Cloud Console or enter manually.",
      type: "select",
      required: true,
      value: "file",
      options: [
        { label: "Upload JSON", value: "file" },
        { label: "Enter manually", value: "manual" },
      ],
      dependsOn: { field: "auth_method", value: "oauth" },
    },
    {
      id: "oauth_credentials_file",
      label: "OAuth Credentials",
      description: "Credentials → OAuth 2.0 Client IDs → Download JSON",
      type: "file",
      required: true,
      value: "",
      accept: ".json",
      fileType: "json",
      dependsOn: [
        { field: "auth_method", value: "oauth" },
        { field: "oauth_input_method", value: "file" },
      ],
    },
    {
      id: "client_id",
      label: "Client ID",
      description: "From Google Cloud Console",
      type: "text",
      required: true,
      value: "",
      placeholder: "123456789.apps.googleusercontent.com",
      dependsOn: [
        { field: "auth_method", value: "oauth" },
        { field: "oauth_input_method", value: "manual" },
      ],
    },
    {
      id: "client_secret",
      label: "Client Secret",
      description: "From Google Cloud Console",
      type: "password",
      required: true,
      value: "",
      dependsOn: [
        { field: "auth_method", value: "oauth" },
        { field: "oauth_input_method", value: "manual" },
      ],
    },

    // Service Account settings
    {
      id: "sa_input_method",
      label: "Credentials",
      description: "Upload JSON key file or paste contents.",
      type: "select",
      required: true,
      value: "file",
      options: [
        { label: "Upload JSON", value: "file" },
        { label: "Paste JSON", value: "paste" },
      ],
      dependsOn: { field: "auth_method", value: "service_account" },
    },
    {
      id: "service_account_file",
      label: "Service Account Key",
      description: "IAM → Service Accounts → Keys → Create new key (JSON)",
      type: "file",
      required: true,
      value: "",
      accept: ".json",
      fileType: "json",
      dependsOn: [
        { field: "auth_method", value: "service_account" },
        { field: "sa_input_method", value: "file" },
      ],
    },
    {
      id: "service_account_json",
      label: "Service Account JSON",
      description: "Paste the full JSON key file contents",
      type: "textarea",
      required: true,
      value: "",
      rows: 8,
      dependsOn: [
        { field: "auth_method", value: "service_account" },
        { field: "sa_input_method", value: "paste" },
      ],
    },
    {
      id: "delegated_email",
      label: "Admin Email",
      description:
        "Workspace admin email to impersonate for domain-wide access.",
      type: "text",
      required: true,
      value: "",
      placeholder: "admin@company.com",
      dependsOn: { field: "auth_method", value: "service_account" },
    },

    // Sync settings
    {
      id: "include_shared_drives",
      label: "Include Shared Drives",
      description: "Index files from team shared drives (Workspace only).",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "include_folders",
      label: "Include Folders",
      description: "Only sync files in these folders. Leave empty for all.",
      type: "text",
      required: false,
      value: "",
      placeholder: "Folder1, Folder2",
    },
    {
      id: "exclude_folders",
      label: "Exclude Folders",
      description: "Skip files in these folders.",
      type: "text",
      required: false,
      value: "",
      placeholder: "Trash, Archive",
    },
    {
      id: "file_types",
      label: "File Types",
      description:
        "Only sync these file types. Leave empty for all supported types.",
      type: "text",
      required: false,
      value: "",
      placeholder: "document, spreadsheet, pdf",
    },
    {
      id: "max_file_size_mb",
      label: "Max File Size (MB)",
      description: "Skip files larger than this size.",
      type: "number",
      required: false,
      value: 50,
    },
    {
      id: "extract_content",
      label: "Extract Content",
      description: "Extract text from documents, PDFs, and Office files.",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "index_media",
      label: "Transcribe Media",
      description: "Transcribe video and audio files.",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "enable_push_notifications",
      label: "Real-time Updates",
      description: "Receive instant updates via Drive webhooks.",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "sync_mode",
      label: "Sync Mode",
      description:
        "Full indexing stores all files. Federated searches Drive directly.",
      type: "select",
      required: false,
      value: "full",
      options: [
        { label: "Full Indexing", value: "full" },
        { label: "Federated Search", value: "federated" },
        { label: "Hybrid", value: "hybrid" },
      ],
    },
    {
      id: "lookback_days",
      label: "History (days)",
      description: "How far back to sync. Leave empty for unlimited.",
      type: "text",
      required: false,
      value: "",
      placeholder: "Unlimited",
    },
  ],
};

export default googleDriveApp;
