import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const servicenowApp: UnifiedApp = {
  id: AppType.SERVICENOW,
  name: "ServiceNow",
  category: "ITSM",
  active: true,
  logo: AppType.SERVICENOW,
  short_description:
    "Search across incidents, knowledge articles, and change requests.",
  description:
    "Connect ServiceNow to search across incidents, knowledge base articles, and change requests. Supports OAuth 2.0 with incremental sync via Table API.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "ServiceNow, Inc.",
  website: "https://www.servicenow.com",

  searchDisplay: {
    defaultIconKey: "Ticket",
    documentTypes: {
      incident: { label: "incident", iconKey: "Ticket", category: "ticket" },
      article: {
        label: "article",
        iconKey: "FileText",
        category: "article",
      },
      change_request: {
        label: "change request",
        iconKey: "GitBranch",
        category: "ticket",
      },
    },
  },

  features: [
    "Semantic search across incidents and knowledge articles",
    "Incremental sync via sys_updated_on filters",
    "Incidents, knowledge articles, and change requests",
  ],

  auth: {
    type: AuthType.OAUTH2,
    config: {
      authUrl: "https://instance.service-now.com/oauth_auth.do",
      tokenUrl: "https://instance.service-now.com/oauth_token.do",
      redirectPath: "/connectors/setup/servicenow/oauth/callback",
      scopes: ["useraccount"],
    },
  },

  streams: [
    {
      name: "incidents",
      label: "Incidents",
      description:
        "IT incidents with description, state, priority, and assignment",
      entityType: "activity",
      dataPoints: [
        "Short Description",
        "Description",
        "State",
        "Priority",
        "Assigned To",
      ],
      isPii: true,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "knowledge",
      label: "Knowledge Articles",
      description: "Knowledge base articles from ServiceNow",
      entityType: "resource",
      dataPoints: ["Short Description", "Text", "Workflow State", "Author"],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
    {
      name: "change_requests",
      label: "Change Requests",
      description: "Change requests with description, state, and priority",
      entityType: "activity",
      dataPoints: [
        "Short Description",
        "Description",
        "State",
        "Priority",
        "Type",
      ],
      isPii: true,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 30,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "instance",
      label: "Instance Name",
      description:
        "Your ServiceNow instance name (e.g., 'mycompany' from mycompany.service-now.com)",
      type: "text",
      required: true,
      value: "",
      placeholder: "mycompany",
    },
    {
      id: "oauth_input_method",
      label: "Credentials",
      description: "Enter ServiceNow OAuth credentials.",
      type: "select",
      required: true,
      value: "manual",
      options: [{ label: "Enter manually", value: "manual" }],
    },
    {
      id: "client_id",
      label: "Client ID",
      description: "ServiceNow OAuth client identifier",
      type: "text",
      required: true,
      value: "",
      placeholder: "your_client_id",
    },
    {
      id: "client_secret",
      label: "Client Secret",
      description: "ServiceNow OAuth client secret",
      type: "password",
      required: true,
      value: "",
    },
    {
      id: "sync_knowledge",
      label: "Sync Knowledge Articles",
      description: "Sync knowledge articles from the knowledge base.",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "sync_changes",
      label: "Sync Change Requests",
      description: "Sync change requests.",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "lookback_days",
      label: "History (days)",
      description: "How far back to sync records. Leave empty for unlimited.",
      type: "text",
      required: false,
      value: "",
      placeholder: "Unlimited",
    },
    {
      id: "category_filter",
      label: "Category Filter",
      description: "Only sync incidents in these categories.",
      type: "text",
      required: false,
      value: "",
      placeholder: "Hardware, Software, Network",
    },
    {
      id: "assignment_group_filter",
      label: "Assignment Group Filter",
      description: "Only sync incidents assigned to these groups.",
      type: "text",
      required: false,
      value: "",
      placeholder: "",
    },
  ],
};

export default servicenowApp;
