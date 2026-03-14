import type {
  DatasetCategory,
  DatasetMetadata,
  PublicDatasetAppType,
} from "./schemas";

export interface DatasetRegistryEntry extends DatasetMetadata {
  appType: PublicDatasetAppType;
}

export const DATASET_REGISTRY: Record<
  PublicDatasetAppType,
  DatasetRegistryEntry
> = {
  NVD: {
    appType: "NVD",
    name: "National Vulnerability Database",
    description:
      "CVE vulnerability records from NIST with CVSS scores and CWE classifications",
    category: "security",
    sourceUrl: "https://nvd.nist.gov",
    license: "Public Domain",
    updateFrequency: "hourly",
    estimatedDocuments: 260_000,
    dataFormat: "json",
    apiBaseUrl: "https://services.nvd.nist.gov/rest/json/cves/2.0",
  },
  CISA_KEV: {
    appType: "CISA_KEV",
    name: "CISA Known Exploited Vulnerabilities",
    description:
      "Actively exploited vulnerabilities catalog maintained by CISA",
    category: "security",
    sourceUrl: "https://www.cisa.gov/known-exploited-vulnerabilities-catalog",
    license: "Public Domain",
    updateFrequency: "daily",
    estimatedDocuments: 1500,
    dataFormat: "json",
    apiBaseUrl:
      "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json",
  },
  MITRE_ATTACK: {
    appType: "MITRE_ATTACK",
    name: "MITRE ATT&CK",
    description:
      "Adversarial tactics, techniques, and common knowledge framework",
    category: "security",
    sourceUrl: "https://attack.mitre.org",
    license: "Apache 2.0",
    updateFrequency: "quarterly",
    estimatedDocuments: 2500,
    dataFormat: "json",
    apiBaseUrl:
      "https://raw.githubusercontent.com/mitre-attack/attack-stix-data/master",
  },
  OWASP: {
    appType: "OWASP",
    name: "OWASP",
    description:
      "Web application security resources: Top 10, Cheat Sheets, ASVS, Testing Guide",
    category: "security",
    sourceUrl: "https://owasp.org",
    license: "CC BY-SA 4.0",
    updateFrequency: "monthly",
    estimatedDocuments: 250,
    dataFormat: "html",
  },
};

export function getDatasetsByCategory(
  category: DatasetCategory
): DatasetRegistryEntry[] {
  return Object.values(DATASET_REGISTRY).filter(
    (entry) => entry.category === category
  );
}

export function getDatasetEntry(
  appType: PublicDatasetAppType
): DatasetRegistryEntry {
  return DATASET_REGISTRY[appType];
}
