import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const haystackApp: UnifiedApp = {
  id: AppType.HAYSTACK,
  name: "Haystack",
  category: "HR & People",
  active: true,
  logo: AppType.HAYSTACK,
  short_description:
    "Search employee profiles, teams, departments, and office locations from Haystack",
  description:
    "Connect Haystack to search across your employee directory including people profiles, teams, departments, and office locations. Supports API key authentication with offset-based pagination and updated_after incremental sync.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Haystack Team",
  website: "https://www.haystackteam.com",

  searchDisplay: {
    defaultIconKey: "UsersIcon",
    documentTypes: {
      person: {
        label: "person",
        iconKey: "UserIcon",
        category: "contact",
      },
      team: {
        label: "team",
        iconKey: "UsersIcon",
        category: "group",
      },
      department: {
        label: "department",
        iconKey: "BuildingIcon",
        category: "group",
      },
      location: {
        label: "location",
        iconKey: "MapPinIcon",
        category: "location",
      },
    },
  },

  features: [
    "Employee profile search with title, department, and contact info",
    "Team directory with membership and manager hierarchy",
    "Department listing with headcount and leadership",
    "Office location directory with address details",
    "Incremental sync via updated_after parameter",
  ],

  auth: {
    type: AuthType.API_KEY,
    config: {
      headerName: "Authorization",
      documentationUrl:
        "https://support.haystackteam.com/en/collections/3276723-integrations",
    },
  },

  streams: [
    {
      name: "people",
      label: "People",
      description:
        "Employee profiles with title, department, contact info, and manager",
      entityType: "activity",
      isPii: true,
      dataPoints: [
        "Name",
        "Email",
        "Title",
        "Department",
        "Manager",
        "Phone",
        "Location",
        "Start Date",
        "Updated",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "teams",
      label: "Teams",
      description: "Team definitions with members, leads, and descriptions",
      entityType: "resource",
      isPii: false,
      dataPoints: [
        "Name",
        "Description",
        "Lead",
        "Members",
        "Created",
        "Updated",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
    {
      name: "departments",
      label: "Departments",
      description: "Department hierarchy with headcount and leadership",
      entityType: "resource",
      isPii: false,
      dataPoints: [
        "Name",
        "Description",
        "Head",
        "Headcount",
        "Parent",
        "Created",
        "Updated",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
    {
      name: "locations",
      label: "Locations",
      description: "Office locations with address and timezone",
      entityType: "resource",
      isPii: false,
      dataPoints: [
        "Name",
        "Address",
        "City",
        "Country",
        "Timezone",
        "Created",
        "Updated",
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
      description:
        "Haystack API key. Generate from Settings > Integrations > API in your Haystack workspace.",
      type: "password",
      required: true,
      value: "",
      placeholder: "Your Haystack API key",
    },
    {
      id: "sync_teams",
      label: "Sync Teams",
      description: "Include teams in search results",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "sync_departments",
      label: "Sync Departments",
      description: "Include departments in search results",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "sync_locations",
      label: "Sync Locations",
      description: "Include office locations in search results",
      type: "switch",
      required: false,
      value: true,
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

export default haystackApp;
