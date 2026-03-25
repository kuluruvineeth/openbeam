import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const jenkinsApp: UnifiedApp = {
  id: AppType.JENKINS,
  name: "Jenkins",
  category: "CI/CD",
  active: true,
  logo: AppType.JENKINS,
  short_description:
    "Search jobs, builds, and pipeline configurations from Jenkins.",
  description:
    "Connect Jenkins to search across build jobs, pipeline configurations, build history with console output, views, and agent nodes. Supports Basic auth with username + API token.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Jenkins",
  website: "https://www.jenkins.io",

  searchDisplay: {
    defaultIconKey: "ServerStackIcon",
    documentTypes: {
      job: {
        label: "job",
        iconKey: "SettingsIcon",
        category: "task",
      },
      build: {
        label: "build",
        iconKey: "PlayIcon",
        category: "event",
      },
      view: {
        label: "view",
        iconKey: "LayoutDashboardIcon",
        category: "document",
      },
      node: {
        label: "node",
        iconKey: "ServerStackIcon",
        category: "device",
      },
    },
  },

  features: [
    "Job search with build status, health reports, and configuration",
    "Build history with result, duration, and console output indexing",
    "View (job group) indexing with member job lists",
    "Agent node listing with executor and offline status",
    "Incremental sync via build number tracking",
    "Basic auth with username + API token",
  ],

  auth: {
    type: AuthType.API_KEY,
    config: {
      headerName: "Authorization",
      documentationUrl:
        "https://www.jenkins.io/doc/book/system-administration/authenticating-scripted-clients/",
    },
  },

  streams: [
    {
      name: "jobs",
      label: "Jobs",
      description:
        "Jenkins jobs (freestyle, pipeline, multibranch) with build status and health reports",
      entityType: "resource",
      isPii: false,
      dataPoints: [
        "Name",
        "URL",
        "Color/Status",
        "Last Build",
        "Health Report",
        "Description",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "builds",
      label: "Builds",
      description:
        "Build executions with result, duration, parameters, and console output",
      entityType: "activity",
      isPii: false,
      dataPoints: [
        "Build Number",
        "Result",
        "Duration",
        "Timestamp",
        "Parameters",
        "Console Output",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "views",
      label: "Views",
      description: "Jenkins views (job groups) with member job lists",
      entityType: "resource",
      isPii: false,
      dataPoints: ["Name", "URL", "Description", "Jobs"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
    {
      name: "nodes",
      label: "Nodes",
      description: "Jenkins agent nodes with executor count and status",
      entityType: "resource",
      isPii: false,
      dataPoints: [
        "Display Name",
        "Executors",
        "Offline Status",
        "Architecture",
        "OS",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "instance_url",
      label: "Jenkins URL",
      description:
        "The base URL of your Jenkins instance (e.g., https://jenkins.example.com).",
      type: "text",
      required: true,
      value: "",
      placeholder: "https://jenkins.example.com",
    },
    {
      id: "username",
      label: "Username",
      description: "Your Jenkins username for API authentication.",
      type: "text",
      required: true,
      value: "",
      placeholder: "admin",
    },
    {
      id: "api_token",
      label: "API Token",
      description:
        "Jenkins API token. Generate from User > Configure > API Token in Jenkins.",
      type: "password",
      required: true,
      value: "",
      placeholder: "Your Jenkins API Token",
    },
    {
      id: "sync_console_output",
      label: "Sync Console Output",
      description:
        "Include build console output in search results. Increases sync time and storage.",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "max_builds_per_job",
      label: "Max Builds Per Job",
      description:
        "Maximum number of recent builds to sync per job (0 = all available).",
      type: "text",
      required: false,
      value: "25",
      placeholder: "25",
    },
    {
      id: "sync_nodes",
      label: "Sync Nodes",
      description: "Include agent nodes in search results.",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "sync_views",
      label: "Sync Views",
      description: "Include views (job groups) in search results.",
      type: "switch",
      required: false,
      value: true,
    },
  ],
};

export default jenkinsApp;
