import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const salesforceApp: UnifiedApp = {
  id: AppType.SALESFORCE,
  name: "Salesforce",
  category: "CRM",
  active: true,
  logo: AppType.SALESFORCE,
  short_description:
    "Search across accounts, contacts, opportunities, and cases.",
  description:
    "Connect Salesforce to search across CRM data including accounts, contacts, opportunities, cases, and knowledge articles. Supports OAuth 2.0 with SOQL incremental sync.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Salesforce, Inc.",
  website: "https://www.salesforce.com",

  searchDisplay: {
    defaultIconKey: "Cloud",
    documentTypes: {
      account: { label: "account", iconKey: "Building", category: "crm" },
      contact: { label: "contact", iconKey: "UserCircle", category: "crm" },
      opportunity: {
        label: "opportunity",
        iconKey: "TrendingUp",
        category: "crm",
      },
      case: { label: "case", iconKey: "Ticket", category: "support" },
      article: { label: "article", iconKey: "FileText", category: "document" },
    },
  },

  features: [
    "Semantic search across CRM objects",
    "Incremental sync via SOQL timestamp filtering",
    "Accounts, contacts, opportunities, cases, and knowledge articles",
  ],

  auth: {
    type: AuthType.OAUTH2,
    config: {
      authUrl: "https://login.salesforce.com/services/oauth2/authorize",
      tokenUrl: "https://login.salesforce.com/services/oauth2/token",
      redirectPath: "/connectors/setup/salesforce/oauth/callback",
      scopes: ["api", "refresh_token", "offline_access"],
    },
  },

  streams: [
    {
      name: "accounts",
      label: "Accounts",
      description: "Company accounts and organizations",
      entityType: "resource",
      dataPoints: ["Name", "Industry", "Website", "Description", "Owner"],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 30,
      supportsBackfill: true,
    },
    {
      name: "contacts",
      label: "Contacts",
      description: "Contact records",
      entityType: "resource",
      dataPoints: ["Name", "Email", "Title", "Account", "Phone"],
      isPii: true,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 30,
      supportsBackfill: true,
    },
    {
      name: "opportunities",
      label: "Opportunities",
      description: "Sales opportunities and deals",
      entityType: "activity",
      dataPoints: ["Name", "Stage", "Amount", "CloseDate", "Account"],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "cases",
      label: "Cases",
      description: "Support cases and tickets",
      entityType: "activity",
      dataPoints: ["Subject", "Description", "Status", "Priority"],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "oauth_input_method",
      label: "Credentials",
      description: "Enter Salesforce Connected App credentials.",
      type: "select",
      required: true,
      value: "manual",
      options: [{ label: "Enter manually", value: "manual" }],
    },
    {
      id: "client_id",
      label: "Consumer Key",
      description: "From Salesforce Connected App settings",
      type: "text",
      required: true,
      value: "",
      placeholder: "3MVG9...",
    },
    {
      id: "client_secret",
      label: "Consumer Secret",
      description: "From Salesforce Connected App settings",
      type: "password",
      required: true,
      value: "",
    },
    {
      id: "login_url",
      label: "Login URL",
      description:
        "Use login.salesforce.com for production, test.salesforce.com for sandbox.",
      type: "text",
      required: false,
      value: "https://login.salesforce.com",
      placeholder: "https://login.salesforce.com",
    },
    {
      id: "sync_cases",
      label: "Sync Cases",
      description: "Index support cases as searchable documents.",
      type: "switch",
      required: false,
      value: true,
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

export default salesforceApp;
