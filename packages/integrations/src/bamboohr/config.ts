import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const bamboohrApp: UnifiedApp = {
  id: AppType.BAMBOOHR,
  name: "BambooHR",
  category: "Human Resources",
  active: true,
  logo: AppType.BAMBOOHR,
  short_description:
    "Search across employee directory, org chart, and time off records.",
  description:
    "Connect BambooHR to search across the employee directory, organizational hierarchy, job titles, departments, and time off requests. Supports incremental sync via the changed employees API.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "BambooHR",
  website: "https://www.bamboohr.com",

  searchDisplay: {
    defaultIconKey: "UsersIcon",
    documentTypes: {
      employee: {
        label: "employee",
        iconKey: "UserIcon",
        category: "contact",
      },
      time_off_request: {
        label: "time off",
        iconKey: "CalendarIcon",
        category: "event",
      },
    },
  },

  features: [
    "Employee directory search",
    "Org chart and reporting hierarchy",
    "Department and division filtering",
    "Time off request visibility",
    "Incremental sync via changed employees API",
  ],

  auth: {
    type: AuthType.API_KEY,
    config: {
      headerName: "Authorization",
      documentationUrl:
        "https://documentation.bamboohr.com/docs/getting-started",
    },
  },

  streams: [
    {
      name: "employees",
      label: "Employees",
      description:
        "Employee directory with names, titles, departments, and contact info",
      entityType: "identity",
      isPii: true,
      dataPoints: [
        "Name",
        "Email",
        "Job Title",
        "Department",
        "Division",
        "Location",
        "Phone",
        "Hire Date",
        "Manager",
        "Status",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
    {
      name: "time_off",
      label: "Time Off Requests",
      description: "Employee time off requests and balances",
      entityType: "activity",
      isPii: true,
      dataPoints: [
        "Employee",
        "Type",
        "Start Date",
        "End Date",
        "Status",
        "Amount",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 120,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "api_key",
      label: "API Key",
      description:
        "Generate from BambooHR > Account > API Keys. The key owner determines data access scope.",
      type: "password",
      required: true,
      value: "",
      placeholder: "Your BambooHR API key",
    },
    {
      id: "subdomain",
      label: "Company Subdomain",
      description:
        "Your BambooHR subdomain (e.g., 'acme' from acme.bamboohr.com)",
      type: "text",
      required: true,
      value: "",
      placeholder: "acme",
    },
    {
      id: "sync_terminated",
      label: "Include Terminated Employees",
      description: "Sync employees with terminated status",
      type: "switch",
      required: false,
      value: false,
    },
    {
      id: "sync_time_off",
      label: "Sync Time Off Requests",
      description: "Include time off requests in search results",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "lookback_days",
      label: "Lookback Days",
      description:
        "Number of days of historical time off requests to sync (0 = all)",
      type: "text",
      required: false,
      value: "90",
      placeholder: "90",
    },
  ],
};

export default bamboohrApp;
