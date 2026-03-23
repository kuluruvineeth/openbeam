import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const docuSignApp: UnifiedApp = {
  id: AppType.DOCUSIGN,
  name: "DocuSign",
  category: "Document Management",
  active: true,
  logo: AppType.DOCUSIGN,
  short_description:
    "Search across envelopes, templates, and folders from DocuSign.",
  description:
    "Connect DocuSign to search across electronic signature envelopes, document templates, and folder structures. Supports OAuth 2.0 with date-based incremental sync.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "DocuSign, Inc.",
  website: "https://www.docusign.com",

  searchDisplay: {
    defaultIconKey: "FileText",
    documentTypes: {
      envelope: {
        label: "envelope",
        iconKey: "FileText",
        category: "document",
      },
      template: {
        label: "template",
        iconKey: "FileTemplate",
        category: "document",
      },
      folder: { label: "folder", iconKey: "Folder", category: "folder" },
    },
  },

  features: [
    "Semantic search across envelopes, templates, and folders",
    "Incremental sync via from_date envelope filtering",
    "OAuth 2.0 authentication with automatic token refresh",
    "Environment support for demo and production accounts",
  ],

  auth: {
    type: AuthType.OAUTH2,
    config: {
      authUrl: "https://account.docusign.com/oauth/auth",
      tokenUrl: "https://account.docusign.com/oauth/token",
      redirectPath: "/connectors/setup/docusign/oauth/callback",
      scopes: ["signature", "extended"],
    },
  },

  streams: [
    {
      name: "envelopes",
      label: "Envelopes",
      description:
        "Documents sent for electronic signature with recipients and status",
      entityType: "activity",
      dataPoints: [
        "Subject",
        "Status",
        "Recipients",
        "Sender",
        "Created",
        "Completed",
      ],
      isPii: true,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "templates",
      label: "Templates",
      description: "Reusable document templates for signature workflows",
      entityType: "resource",
      dataPoints: ["Name", "Description", "Owner", "Shared", "Roles"],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
    {
      name: "folders",
      label: "Folders",
      description: "Folder structure organizing envelopes",
      entityType: "resource",
      dataPoints: ["Name", "Type", "ItemCount"],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "oauth_input_method",
      label: "Credentials",
      description: "Enter DocuSign OAuth app credentials.",
      type: "select",
      required: true,
      value: "manual",
      options: [{ label: "Enter manually", value: "manual" }],
    },
    {
      id: "client_id",
      label: "Integration Key",
      description: "From DocuSign Apps and Keys settings",
      type: "text",
      required: true,
      value: "",
      placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    },
    {
      id: "client_secret",
      label: "Secret Key",
      description: "From DocuSign Apps and Keys settings",
      type: "password",
      required: true,
      value: "",
    },
    {
      id: "environment",
      label: "Environment",
      description:
        "DocuSign environment (demo for testing, production for live)",
      type: "select",
      required: true,
      value: "production",
      options: [
        { label: "Production", value: "production" },
        { label: "Demo (Sandbox)", value: "demo" },
      ],
    },
    {
      id: "sync_templates",
      label: "Sync Templates",
      description: "Index document templates as searchable documents.",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "sync_folders",
      label: "Sync Folders",
      description: "Index folder structure as searchable documents.",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "envelope_status_filter",
      label: "Envelope Status Filter",
      description:
        "Comma-separated statuses to sync (e.g. completed, sent, delivered). Leave empty for all.",
      type: "text",
      required: false,
      value: "",
      placeholder: "completed, sent, delivered",
    },
    {
      id: "lookback_days",
      label: "History (days)",
      description: "How far back to sync envelopes. Default is 365.",
      type: "text",
      required: false,
      value: "365",
      placeholder: "365",
    },
  ],
};

export default docuSignApp;
