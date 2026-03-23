import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const workdayApp: UnifiedApp = {
  id: AppType.WORKDAY,
  name: "Workday",
  category: "Human Resources",
  active: true,
  logo: AppType.WORKDAY,
  short_description:
    "Search across workers, organizations, and knowledge articles from Workday.",
  description:
    "Connect Workday to search across the employee directory, organizational hierarchy, job titles, departments, and knowledge articles. Uses OAuth 2.0 for secure tenant-scoped access with incremental sync support.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Workday",
  website: "https://www.workday.com",

  searchDisplay: {
    defaultIconKey: "UsersIcon",
    documentTypes: {
      worker: {
        label: "worker",
        iconKey: "UserIcon",
        category: "contact",
      },
      organization: {
        label: "organization",
        iconKey: "BuildingIcon",
        category: "group",
      },
    },
  },

  features: [
    "Employee directory search with job titles and departments",
    "Organization hierarchy and structure",
    "Manager and reporting chain visibility",
    "Incremental sync via effective date filtering",
    "OAuth 2.0 with tenant-scoped access",
  ],

  auth: {
    type: AuthType.OAUTH2,
    config: {
      authUrl: "https://{host}/authorize",
      tokenUrl: "https://{host}/ccx/oauth2/{tenant}/token",
      scopes: ["r:workers", "r:organizations"],
    },
  },

  streams: [
    {
      name: "workers",
      label: "Workers",
      description:
        "Employee directory with names, titles, departments, locations, and reporting chain",
      entityType: "identity",
      isPii: true,
      dataPoints: [
        "Name",
        "Email",
        "Job Title",
        "Department",
        "Location",
        "Manager",
        "Hire Date",
        "Status",
        "Worker Type",
        "Employee ID",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
    {
      name: "organizations",
      label: "Organizations",
      description:
        "Organizational units including departments, cost centers, and supervisory orgs",
      entityType: "resource",
      isPii: false,
      dataPoints: [
        "Name",
        "Type",
        "Parent Organization",
        "Manager",
        "Member Count",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 120,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "tenant",
      label: "Tenant Name",
      description:
        "Your Workday tenant name (e.g., from the URL: https://host/ccx/api/v1/{tenant}/)",
      type: "text",
      required: true,
      value: "",
      placeholder: "your_tenant",
    },
    {
      id: "host",
      label: "Host",
      description:
        "Workday datacenter host (e.g., wd2-impl-services1.workday.com or wd5-services1.myworkday.com)",
      type: "text",
      required: true,
      value: "",
      placeholder: "wd5-services1.myworkday.com",
    },
    {
      id: "sync_organizations",
      label: "Sync Organizations",
      description: "Include organizational units in search results",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "sync_terminated",
      label: "Include Terminated Workers",
      description: "Sync workers with terminated status",
      type: "switch",
      required: false,
      value: false,
    },
    {
      id: "lookback_days",
      label: "Lookback Days",
      description:
        "Number of days of historical data to sync on first run (0 = all)",
      type: "text",
      required: false,
      value: "90",
      placeholder: "90",
    },
  ],
};

export default workdayApp;
