import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const freshserviceApp: UnifiedApp = {
  id: AppType.FRESHSERVICE,
  name: "Freshservice",
  category: "IT Service Management",
  active: true,
  logo: AppType.FRESHSERVICE,
  short_description:
    "Search across tickets, knowledge articles, changes, and problems.",
  description:
    "Connect Freshservice to search across IT service desk tickets, knowledge base articles, change requests, and problem records. Supports incremental sync via updated_since timestamps and ticket actions.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Freshworks",
  website: "https://www.freshservice.com",
  searchDisplay: {
    defaultIconKey: "TicketIcon",
    documentTypes: {
      ticket: {
        label: "ticket",
        iconKey: "TicketIcon",
        category: "ticket",
      },
      article: {
        label: "article",
        iconKey: "FileTextIcon",
        category: "article",
      },
      change: {
        label: "change",
        iconKey: "GitBranchIcon",
        category: "task",
      },
      problem: {
        label: "problem",
        iconKey: "AlertCircleIcon",
        category: "incident",
      },
    },
  },

  features: [
    "Ticket search with status, priority, and requester",
    "Knowledge base articles with folder hierarchy",
    "Change request tracking with approval status",
    "Problem records with root cause analysis",
    "Incremental sync via updated_since timestamps",
    "Ticket actions: create, update, add note, reply",
  ],

  auth: {
    type: AuthType.API_KEY,
    config: {
      headerName: "Authorization",
      documentationUrl:
        "https://support.freshservice.com/support/solutions/articles/50000000306",
    },
  },

  streams: [
    {
      name: "tickets",
      label: "Tickets",
      description:
        "Tickets with subject, description, status, priority, requester, and agent",
      entityType: "activity",
      dataPoints: [
        "Subject",
        "Description",
        "Status",
        "Priority",
        "Type",
        "Requester",
        "Agent",
        "Group",
        "Tags",
        "Created At",
        "Updated At",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "articles",
      label: "Knowledge Articles",
      description:
        "Solution articles with title, body, folder, status, and tags",
      entityType: "resource",
      dataPoints: [
        "Title",
        "Description",
        "Folder",
        "Category",
        "Status",
        "Tags",
        "Created At",
        "Updated At",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
    {
      name: "changes",
      label: "Changes",
      description:
        "Change requests with subject, description, status, and priority",
      entityType: "activity",
      dataPoints: [
        "Subject",
        "Description",
        "Status",
        "Priority",
        "Change Type",
        "Requester",
        "Agent",
        "Created At",
        "Updated At",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
    {
      name: "problems",
      label: "Problems",
      description:
        "Problem records with subject, description, status, and priority",
      entityType: "activity",
      dataPoints: [
        "Subject",
        "Description",
        "Status",
        "Priority",
        "Impact",
        "Agent",
        "Created At",
        "Updated At",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "api_key",
      label: "API Key",
      description: "From Freshservice profile > Your API Key",
      type: "password",
      required: true,
      value: "",
      placeholder: "your-api-key",
    },
    {
      id: "domain",
      label: "Domain",
      description:
        "Your Freshservice subdomain (e.g., 'acme' for acme.freshservice.com)",
      type: "text",
      required: true,
      value: "",
      placeholder: "acme",
    },
    {
      id: "sync_articles",
      label: "Sync Knowledge Articles",
      description: "Include knowledge base articles in search",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "sync_changes",
      label: "Sync Changes",
      description: "Include change requests in search",
      type: "switch",
      required: false,
      value: false,
    },
    {
      id: "sync_problems",
      label: "Sync Problems",
      description: "Include problem records in search",
      type: "switch",
      required: false,
      value: false,
    },
    {
      id: "lookback_days",
      label: "Lookback Days",
      description: "How many days of tickets to sync (default 90)",
      type: "text",
      required: false,
      value: "90",
      placeholder: "90",
    },
    {
      id: "status_filter",
      label: "Status Filter",
      description: "Comma-separated statuses: open, pending, resolved, closed",
      type: "text",
      required: false,
      value: "",
      placeholder: "open,pending,resolved,closed",
    },
    {
      id: "priority_filter",
      label: "Priority Filter",
      description: "Comma-separated priorities: low, medium, high, urgent",
      type: "text",
      required: false,
      value: "",
      placeholder: "low,medium,high,urgent",
    },
  ],
};

export default freshserviceApp;
