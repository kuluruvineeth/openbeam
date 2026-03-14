import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const nvdApp: UnifiedApp = {
  id: AppType.NVD,
  name: "NVD",
  category: "Security & Vulnerability",
  active: true,
  logo: AppType.NVD,
  short_description: "Search 260K+ CVE vulnerability records from NIST.",
  description:
    "Connect the National Vulnerability Database to search across all published CVE records. Includes CVSS scores, CWE classifications, affected products, and references. Public dataset — no authentication required.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "NIST",
  website: "https://nvd.nist.gov",

  searchDisplay: {
    defaultIconKey: "ShieldIcon",
    documentTypes: {
      vulnerability: {
        label: "vulnerability",
        iconKey: "AlertCircleIcon",
        category: "vulnerability",
      },
    },
  },

  features: [
    "260K+ CVE vulnerability records",
    "CVSS v3.1 severity scores",
    "CWE weakness classifications",
    "Affected product configurations",
    "Incremental sync via lastModified",
  ],

  auth: {
    type: AuthType.API_KEY,
    config: {
      headerName: "apiKey",
      documentationUrl: "https://nvd.nist.gov/developers/start-here",
    },
  },

  streams: [
    {
      name: "cves",
      label: "CVE Records",
      description: "Common Vulnerabilities and Exposures with CVSS scoring",
      entityType: "resource",
      dataPoints: [
        "CVE ID",
        "Description",
        "CVSS Score",
        "Severity",
        "CWE",
        "References",
        "Affected Products",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 120,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "api_key",
      label: "NVD API Key (Optional)",
      description:
        "Request at nvd.nist.gov/developers. Increases rate limit from 5 to 50 req/30s.",
      type: "password",
      required: false,
      value: "",
      placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    },
  ],
};

export default nvdApp;
