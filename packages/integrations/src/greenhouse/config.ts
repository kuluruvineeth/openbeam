import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const greenhouseApp: UnifiedApp = {
  id: AppType.GREENHOUSE,
  name: "Greenhouse",
  category: "Recruiting",
  active: true,
  logo: AppType.GREENHOUSE,
  short_description:
    "Search across jobs, candidates, applications, and offers in Greenhouse.",
  description:
    "Connect Greenhouse to index and search your recruiting data. Sync jobs, candidates, applications, and offers with incremental sync via updated_after timestamps.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Greenhouse Software",
  website: "https://www.greenhouse.io/",
  searchDisplay: {
    defaultIconKey: "UserIcon",
    documentTypes: {
      job: { label: "job", iconKey: "BriefcaseIcon", category: "job" },
      candidate: {
        label: "candidate",
        iconKey: "UserIcon",
        category: "contact",
      },
      application: {
        label: "application",
        iconKey: "FileIcon",
        category: "application",
      },
      offer: { label: "offer", iconKey: "DocumentIcon", category: "offer" },
    },
  },

  features: [
    "Job listing and status tracking",
    "Candidate profile search",
    "Application pipeline visibility",
    "Offer status tracking",
    "Department and office filtering",
    "Incremental sync via updated_after",
  ],

  auth: {
    type: AuthType.API_KEY,
    config: {
      headerName: "Authorization",
      documentationUrl:
        "https://developers.greenhouse.io/harvest.html#authentication",
    },
  },

  streams: [
    {
      name: "jobs",
      label: "Jobs",
      description: "Open, closed, and draft job postings",
      entityType: "resource",
      dataPoints: [
        "Title",
        "Status",
        "Departments",
        "Offices",
        "Hiring Team",
        "Created At",
        "Updated At",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 30,
      supportsBackfill: true,
    },
    {
      name: "candidates",
      label: "Candidates",
      description: "Candidate profiles with contact information",
      entityType: "identity",
      isPii: true,
      dataPoints: [
        "Name",
        "Emails",
        "Phone Numbers",
        "Tags",
        "Applications",
        "Created At",
        "Updated At",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 30,
      supportsBackfill: true,
    },
    {
      name: "applications",
      label: "Applications",
      description: "Job applications with stage and status tracking",
      entityType: "activity",
      isPii: true,
      dataPoints: [
        "Status",
        "Current Stage",
        "Source",
        "Candidate",
        "Job",
        "Rejection Reason",
        "Applied At",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 30,
      supportsBackfill: true,
    },
    {
      name: "offers",
      label: "Offers",
      description: "Job offers with status and start date",
      entityType: "activity",
      isPii: true,
      dataPoints: [
        "Status",
        "Start Date",
        "Application",
        "Created At",
        "Sent At",
        "Resolved At",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "api_key",
      label: "Greenhouse Harvest API Key",
      description: "API key from Greenhouse Dev Center with Harvest API access",
      type: "password",
      required: true,
      value: "",
      placeholder: "Your Greenhouse Harvest API key",
    },
    {
      id: "sync_candidates",
      label: "Sync Candidates",
      description: "Include candidate profiles in sync",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "sync_applications",
      label: "Sync Applications",
      description: "Include job applications in sync",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "sync_offers",
      label: "Sync Offers",
      description: "Include offers in sync",
      type: "switch",
      required: false,
      value: false,
    },
    {
      id: "lookback_days",
      label: "Lookback Days",
      description:
        "Only sync items modified within this many days. 0 means all items.",
      type: "number",
      required: false,
      value: 0,
    },
    {
      id: "status_filter",
      label: "Job Status Filter",
      description:
        "Filter jobs by status (open, closed, draft). Empty means all.",
      type: "text",
      required: false,
      value: "",
      placeholder: "open",
    },
    {
      id: "department_filter",
      label: "Department Filter",
      description: "Only sync jobs from this department. Empty means all.",
      type: "text",
      required: false,
      value: "",
      placeholder: "Engineering",
    },
  ],
};

export default greenhouseApp;
