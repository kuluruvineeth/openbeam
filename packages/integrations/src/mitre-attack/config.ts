import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const mitreAttackApp: UnifiedApp = {
  id: AppType.MITRE_ATTACK,
  name: "MITRE ATT&CK",
  category: "Security & Vulnerability",
  active: true,
  logo: AppType.MITRE_ATTACK,
  short_description:
    "Search techniques, tactics, and threat groups from ATT&CK.",
  description:
    "Connect the MITRE ATT&CK knowledge base to search across adversary techniques, tactics, threat groups, and software. Includes Enterprise, Mobile, and ICS domains with full relationship mapping. Public dataset — no authentication required.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "MITRE",
  website: "https://attack.mitre.org",

  searchDisplay: {
    defaultIconKey: "GridIcon",
    documentTypes: {
      technique: {
        label: "technique",
        iconKey: "TargetIcon",
        category: "technique",
      },
      tactic: {
        label: "tactic",
        iconKey: "LayersIcon",
        category: "tactic",
      },
      threat_group: {
        label: "threat group",
        iconKey: "UsersIcon",
        category: "threat_group",
      },
      malware: {
        label: "software",
        iconKey: "BugIcon",
        category: "malware",
      },
      mitigation: {
        label: "mitigation",
        iconKey: "ShieldCheckIcon",
        category: "mitigation",
      },
    },
  },

  features: [
    "700+ adversary techniques and sub-techniques",
    "14 tactical categories",
    "170+ threat groups with aliases",
    "900+ software entries",
    "Relationship mapping between entities",
    "Enterprise, Mobile, and ICS domains",
  ],

  auth: {
    type: AuthType.API_KEY,
    config: {
      headerName: "none",
      documentationUrl:
        "https://attack.mitre.org/resources/attack-data-and-tools/",
    },
  },

  streams: [
    {
      name: "techniques",
      label: "Techniques",
      description: "Adversary techniques and sub-techniques (ATT&CK patterns)",
      entityType: "resource",
      dataPoints: [
        "ID",
        "Name",
        "Description",
        "Tactics",
        "Platforms",
        "Data Sources",
        "Detection",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 10_080,
      supportsBackfill: true,
    },
    {
      name: "groups",
      label: "Threat Groups",
      description: "Adversary groups and intrusion sets",
      entityType: "resource",
      dataPoints: ["ID", "Name", "Aliases", "Description", "Techniques Used"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 10_080,
      supportsBackfill: true,
    },
    {
      name: "software",
      label: "Software",
      description: "Malware and legitimate tools used by adversaries",
      entityType: "resource",
      dataPoints: ["ID", "Name", "Type", "Platforms", "Description", "Aliases"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 10_080,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "domains",
      label: "ATT&CK Domains",
      description: "Comma-separated: enterprise, mobile, ics",
      type: "text",
      required: false,
      value: "enterprise",
      placeholder: "enterprise,mobile,ics",
    },
  ],
};

export default mitreAttackApp;
