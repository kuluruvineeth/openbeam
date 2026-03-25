import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const mindtickleApp: UnifiedApp = {
  id: AppType.MINDTICKLE,
  name: "Mindtickle",
  category: "Sales Enablement",
  active: true,
  logo: AppType.MINDTICKLE,
  short_description:
    "Search courses, modules, missions, and content from Mindtickle",
  description:
    "Connect Mindtickle to search across sales readiness data including training courses, lesson modules, assessment missions, and enablement content. Supports API key authentication with page-based pagination and updated_after incremental sync.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Mindtickle Inc",
  website: "https://www.mindtickle.com",

  searchDisplay: {
    defaultIconKey: "BookOpenIcon",
    documentTypes: {
      course: {
        label: "course",
        iconKey: "BookOpenIcon",
        category: "knowledge",
      },
      module: {
        label: "module",
        iconKey: "FileTextIcon",
        category: "knowledge",
      },
      mission: {
        label: "mission",
        iconKey: "TargetIcon",
        category: "project",
      },
      content: {
        label: "content",
        iconKey: "FileIcon",
        category: "knowledge",
      },
    },
  },

  features: [
    "Training course search with completion rates and status tracking",
    "Module content for lesson-level detail within courses",
    "Mission assessments with scoring and completion metrics",
    "Sales enablement content with type and category filtering",
    "Incremental sync via updated_after parameter",
  ],

  auth: {
    type: AuthType.API_KEY,
    config: {
      headerName: "Authorization",
      documentationUrl: "https://developer.mindtickle.com/",
    },
  },

  streams: [
    {
      name: "courses",
      label: "Courses",
      description:
        "Training courses with modules, completion rates, and status",
      entityType: "resource",
      isPii: false,
      dataPoints: [
        "Name",
        "Description",
        "Status",
        "Module Count",
        "Category",
        "Created",
        "Updated",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
    {
      name: "modules",
      label: "Modules",
      description: "Individual lessons and learning units within courses",
      entityType: "resource",
      isPii: false,
      dataPoints: [
        "Title",
        "Content",
        "Type",
        "Course",
        "Duration",
        "Created",
        "Updated",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
    {
      name: "missions",
      label: "Missions",
      description:
        "Assessments, quizzes, and role-play missions for sales readiness",
      entityType: "resource",
      isPii: false,
      dataPoints: [
        "Name",
        "Description",
        "Type",
        "Status",
        "Due Date",
        "Created",
        "Updated",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 30,
      supportsBackfill: true,
    },
    {
      name: "content",
      label: "Content",
      description: "Sales enablement assets, documents, and media",
      entityType: "resource",
      isPii: false,
      dataPoints: [
        "Title",
        "Description",
        "Type",
        "Category",
        "Tags",
        "Created",
        "Updated",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 30,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "api_key",
      label: "API Key",
      description:
        "Mindtickle API key. Generate from Admin > Integrations in your Mindtickle account.",
      type: "password",
      required: true,
      value: "",
      placeholder: "Your Mindtickle API key",
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

export default mindtickleApp;
