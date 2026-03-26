import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const procoreApp: UnifiedApp = {
  id: AppType.PROCORE,
  name: "Procore",
  category: "Construction Management",
  active: true,
  logo: AppType.PROCORE,
  short_description:
    "Search across construction projects, RFIs, submittals, documents, and drawings.",
  description:
    "Connect Procore to search across construction management data including projects, RFIs, submittals, documents, and drawings. Supports OAuth 2.0 with project-scoped incremental sync via updated_at filtering.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Procore Technologies",
  website: "https://www.procore.com",

  searchDisplay: {
    defaultIconKey: "Building",
    documentTypes: {
      project: {
        label: "project",
        iconKey: "Building",
        category: "project",
      },
      rfi: {
        label: "RFI",
        iconKey: "FileText",
        category: "ticket",
      },
      submittal: {
        label: "submittal",
        iconKey: "FileCheck",
        category: "document",
      },
      document: {
        label: "document",
        iconKey: "File",
        category: "file",
      },
      drawing: {
        label: "drawing",
        iconKey: "Image",
        category: "design",
      },
    },
  },

  features: [
    "Semantic search across projects, RFIs, submittals, documents, and drawings",
    "Project-scoped entity syncing with Procore-Company-Id header",
    "Incremental sync via updated_at filtering on project entities",
    "OAuth 2.0 authentication with automatic token refresh",
  ],

  auth: {
    type: AuthType.OAUTH2,
    config: {
      authUrl: "https://login.procore.com/oauth/authorize",
      tokenUrl: "https://login.procore.com/oauth/token",
      redirectPath: "/connectors/setup/procore/oauth/callback",
      scopes: [],
    },
  },

  streams: [
    {
      name: "projects",
      label: "Projects",
      description: "Construction projects with status, dates, and location",
      entityType: "resource",
      dataPoints: [
        "Name",
        "Status",
        "Address",
        "Start Date",
        "Completion Date",
      ],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 30,
      supportsBackfill: true,
    },
    {
      name: "rfis",
      label: "RFIs",
      description: "Requests for Information with questions and responses",
      entityType: "activity",
      dataPoints: [
        "Subject",
        "Question",
        "Answer",
        "Status",
        "Assignee",
        "Due Date",
      ],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "submittals",
      label: "Submittals",
      description: "Construction submittals for material and product approvals",
      entityType: "activity",
      dataPoints: ["Title", "Status", "Spec Section", "Type", "Received From"],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "documents",
      label: "Documents",
      description: "Project documents and files",
      entityType: "resource",
      dataPoints: ["Name", "Document Type", "Size", "Created By"],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 30,
      supportsBackfill: true,
    },
    {
      name: "drawings",
      label: "Drawings",
      description: "Construction drawings and plans",
      entityType: "resource",
      dataPoints: ["Number", "Discipline", "Set", "Revision", "Current"],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 30,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "oauth_input_method",
      label: "Credentials",
      description: "Enter Procore OAuth app credentials.",
      type: "select",
      required: true,
      value: "manual",
      options: [{ label: "Enter manually", value: "manual" }],
    },
    {
      id: "client_id",
      label: "Client ID",
      description: "From Procore Developer Portal app settings",
      type: "text",
      required: true,
      value: "",
      placeholder: "abc123...",
    },
    {
      id: "client_secret",
      label: "Client Secret",
      description: "From Procore Developer Portal app settings",
      type: "password",
      required: true,
      value: "",
    },
    {
      id: "sync_documents",
      label: "Sync Documents",
      description: "Index project documents as searchable content.",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "sync_drawings",
      label: "Sync Drawings",
      description: "Index construction drawings and plans.",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "project_filter",
      label: "Project Filter",
      description:
        "Comma-separated project IDs to sync. Leave empty for all projects.",
      type: "text",
      required: false,
      value: "",
      placeholder: "12345, 67890",
    },
  ],
};

export default procoreApp;
