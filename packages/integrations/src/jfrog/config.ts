import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const jfrogApp: UnifiedApp = {
  id: AppType.JFROG,
  name: "JFrog",
  category: "DevOps",
  active: true,
  logo: AppType.JFROG,
  short_description:
    "Search repositories, artifacts, builds, and security violations from JFrog.",
  description:
    "Connect JFrog to search across Artifactory repositories, artifacts, builds, and Xray security violations. Supports access token authentication with instance-specific URLs.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "JFrog",
  website: "https://jfrog.com",

  searchDisplay: {
    defaultIconKey: "PackageIcon",
    documentTypes: {
      repository: {
        label: "repository",
        iconKey: "FolderIcon",
        category: "repository",
      },
      artifact: {
        label: "artifact",
        iconKey: "PackageIcon",
        category: "file",
      },
      build: {
        label: "build",
        iconKey: "HammerIcon",
        category: "task",
      },
      violation: {
        label: "violation",
        iconKey: "AlertCircleIcon",
        category: "vulnerability",
      },
    },
  },

  features: [
    "Repository browsing with package type and configuration",
    "Artifact search with size, checksum, and download stats",
    "Build history with status, duration, and module details",
    "Xray security violation tracking with severity and CVE references",
    "Incremental sync via modified timestamps and build numbers",
  ],

  auth: {
    type: AuthType.API_KEY,
    config: {
      headerName: "Authorization",
      documentationUrl:
        "https://jfrog.com/help/r/jfrog-platform-administration/access-tokens",
    },
  },

  streams: [
    {
      name: "repositories",
      label: "Repositories",
      description:
        "JFrog Artifactory repositories with type, package type, and configuration",
      entityType: "resource",
      isPii: false,
      dataPoints: [
        "Name",
        "Type",
        "Package Type",
        "Description",
        "URL",
        "Layout",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
    {
      name: "artifacts",
      label: "Artifacts",
      description:
        "Artifacts stored in Artifactory with size, checksums, and properties",
      entityType: "resource",
      isPii: false,
      dataPoints: [
        "Name",
        "Path",
        "Repository",
        "Size",
        "Checksums",
        "Created",
        "Modified",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 30,
      supportsBackfill: true,
    },
    {
      name: "builds",
      label: "Builds",
      description:
        "Build records with status, duration, modules, and artifact references",
      entityType: "activity",
      isPii: false,
      dataPoints: [
        "Name",
        "Number",
        "Status",
        "Started",
        "Duration",
        "Modules",
        "Agent",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "violations",
      label: "Security Violations",
      description:
        "Xray security violations with severity, CVE references, and affected components",
      entityType: "activity",
      isPii: false,
      dataPoints: [
        "Type",
        "Severity",
        "Description",
        "CVE",
        "Component",
        "Fixed Versions",
        "Created",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 30,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "access_token",
      label: "Access Token",
      description:
        "JFrog access token or API key. Generate from Administration > Identity and Access > Access Tokens.",
      type: "password",
      required: true,
      value: "",
      placeholder: "Your JFrog access token",
    },
    {
      id: "instance_url",
      label: "Instance URL",
      description: "Your JFrog Platform URL (e.g., https://mycompany.jfrog.io)",
      type: "text",
      required: true,
      value: "",
      placeholder: "https://mycompany.jfrog.io",
    },
    {
      id: "sync_builds",
      label: "Sync Builds",
      description: "Include build history in search results",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "sync_violations",
      label: "Sync Security Violations",
      description: "Include Xray security violations in search results",
      type: "switch",
      required: false,
      value: true,
    },
  ],
};

export default jfrogApp;
