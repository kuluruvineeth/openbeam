import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const ironcladApp: UnifiedApp = {
  id: AppType.IRONCLAD,
  name: "Ironclad",
  category: "Legal & Contract Management",
  active: true,
  logo: AppType.IRONCLAD,
  short_description:
    "Search workflows, records, approvals, and comments from Ironclad",
  description:
    "Connect Ironclad to search across contract lifecycle data including active workflows, executed records, approval chains, and comments. Supports API key authentication with page-based pagination and lastUpdated incremental sync.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Ironclad, Inc.",
  website: "https://ironcladapp.com",

  searchDisplay: {
    defaultIconKey: "FileTextIcon",
    documentTypes: {
      workflow: {
        label: "workflow",
        iconKey: "GitBranchIcon",
        category: "task",
      },
      record: {
        label: "record",
        iconKey: "FileTextIcon",
        category: "document",
      },
      approval: {
        label: "approval",
        iconKey: "CheckSquareIcon",
        category: "task",
      },
      comment: {
        label: "comment",
        iconKey: "MessageSquareIcon",
        category: "message",
      },
    },
  },

  features: [
    "Workflow search with status, creator, and template tracking",
    "Executed record search with counterparty and metadata",
    "Approval chain visibility with reviewer status",
    "Comment threads on active workflows",
    "Incremental sync via lastUpdated filter",
  ],

  auth: {
    type: AuthType.API_KEY,
    config: {
      headerName: "Authorization",
      documentationUrl:
        "https://developer.ironcladapp.com/docs/getting-started",
    },
  },

  streams: [
    {
      name: "workflows",
      label: "Workflows",
      description:
        "Active contract workflows with status, template, creator, and attributes",
      entityType: "activity",
      isPii: false,
      dataPoints: [
        "Title",
        "Status",
        "Template",
        "Creator",
        "Counterparty",
        "Attributes",
        "Created",
        "Updated",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "records",
      label: "Records",
      description: "Executed contracts with counterparty, dates, and metadata",
      entityType: "resource",
      isPii: false,
      dataPoints: [
        "Title",
        "Counterparty",
        "Effective Date",
        "Expiration Date",
        "Status",
        "Properties",
        "Created",
        "Updated",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
    {
      name: "approvals",
      label: "Approvals",
      description:
        "Approval requests on workflows with reviewer status and decisions",
      entityType: "activity",
      isPii: false,
      dataPoints: [
        "Workflow",
        "Reviewer",
        "Status",
        "Decision",
        "Created",
        "Updated",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "comments",
      label: "Comments",
      description: "Comments and threads on active workflows",
      entityType: "activity",
      isPii: false,
      dataPoints: ["Workflow", "Author", "Body", "Created", "Updated"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "api_key",
      label: "API Key",
      description:
        "Ironclad API key (Bearer token). Generate from Admin Settings > API.",
      type: "password",
      required: true,
      value: "",
      placeholder: "Your Ironclad API key",
    },
    {
      id: "lookback_days",
      label: "Lookback Days",
      description:
        "Number of days of history to sync on first run (0 = all time)",
      type: "text",
      required: false,
      value: "0",
      placeholder: "0",
    },
  ],
};

export default ironcladApp;
