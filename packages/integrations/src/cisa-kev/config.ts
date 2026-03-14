import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const cisaKevApp: UnifiedApp = {
  id: AppType.CISA_KEV,
  name: "CISA KEV",
  category: "Security & Vulnerability",
  active: true,
  logo: AppType.CISA_KEV,
  short_description: "Search CISA's Known Exploited Vulnerabilities catalog.",
  description:
    "Connect the CISA Known Exploited Vulnerabilities catalog to search across actively exploited CVEs with remediation deadlines. Includes ransomware campaign tracking and required actions. Public dataset — no authentication required.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "CISA",
  website: "https://www.cisa.gov/known-exploited-vulnerabilities-catalog",

  searchDisplay: {
    defaultIconKey: "ShieldAlertIcon",
    documentTypes: {
      advisory: {
        label: "advisory",
        iconKey: "AlertTriangleIcon",
        category: "advisory",
      },
    },
  },

  features: [
    "Known exploited vulnerability tracking",
    "Ransomware campaign indicators",
    "Remediation deadlines and actions",
    "Cross-reference with NVD CVE data",
    "Single JSON download — fast full sync",
  ],

  auth: {
    type: AuthType.API_KEY,
    config: {
      headerName: "none",
      documentationUrl:
        "https://www.cisa.gov/known-exploited-vulnerabilities-catalog",
    },
  },

  streams: [
    {
      name: "vulnerabilities",
      label: "Known Exploited Vulnerabilities",
      description:
        "CVEs with confirmed active exploitation and remediation deadlines",
      entityType: "resource",
      dataPoints: [
        "CVE ID",
        "Vendor",
        "Product",
        "Description",
        "Required Action",
        "Due Date",
        "Ransomware Use",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 1440,
      supportsBackfill: true,
    },
  ],

  settings: [],
};

export default cisaKevApp;
