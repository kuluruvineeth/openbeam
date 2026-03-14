import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const owaspApp: UnifiedApp = {
  id: AppType.OWASP,
  name: "OWASP",
  category: "Security & Vulnerability",
  active: true,
  logo: AppType.OWASP,
  short_description:
    "Search OWASP Top 10, Cheat Sheets, ASVS, and Testing Guide.",
  description:
    "Connect the OWASP Foundation knowledge base to search across the Top 10, Cheat Sheet Series, Application Security Verification Standard, and Web Security Testing Guide. Public dataset — no authentication required.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "OWASP Foundation",
  website: "https://owasp.org",

  searchDisplay: {
    defaultIconKey: "LockIcon",
    documentTypes: {
      security_guide: {
        label: "guide",
        iconKey: "BookIcon",
        category: "security_guide",
      },
    },
  },

  features: [
    "OWASP Top 10 (2025 edition)",
    "90+ Cheat Sheets for developers",
    "ASVS 5.0 verification requirements",
    "Web Security Testing Guide (WSTG)",
    "Cross-reference with ATT&CK and CWE",
  ],

  auth: {
    type: AuthType.API_KEY,
    config: {
      headerName: "none",
      documentationUrl: "https://owasp.org/projects/",
    },
  },

  streams: [
    {
      name: "top10",
      label: "Top 10",
      description: "OWASP Top 10 web application security risks (2025)",
      entityType: "resource",
      dataPoints: ["Risk ID", "Name", "Description", "Impact", "Prevention"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 10_080,
      supportsBackfill: true,
    },
    {
      name: "cheatsheets",
      label: "Cheat Sheets",
      description: "Developer-focused security cheat sheets",
      entityType: "resource",
      dataPoints: ["Title", "Content", "Related Topics"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 10_080,
      supportsBackfill: true,
    },
    {
      name: "asvs",
      label: "ASVS",
      description:
        "Application Security Verification Standard requirements (v5.0)",
      entityType: "resource",
      dataPoints: ["Chapter", "Requirement ID", "Description", "Level"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 10_080,
      supportsBackfill: true,
    },
    {
      name: "wstg",
      label: "Testing Guide",
      description: "Web Security Testing Guide test cases",
      entityType: "resource",
      dataPoints: ["Test ID", "Category", "Title", "Procedure"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 10_080,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "projects",
      label: "OWASP Projects",
      description: "Comma-separated: top10, cheatSheets, asvs, wstg",
      type: "text",
      required: false,
      value: "top10,cheatSheets,asvs,wstg",
      placeholder: "top10,cheatSheets,asvs,wstg",
    },
  ],
};

export default owaspApp;
