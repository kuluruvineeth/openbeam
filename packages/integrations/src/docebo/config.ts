import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const doceboApp: UnifiedApp = {
  id: AppType.DOCEBO,
  name: "Docebo",
  category: "Learning Management",
  active: true,
  logo: AppType.DOCEBO,
  short_description:
    "Search courses, learning plans, users, enrollments, and certifications.",
  description:
    "Connect Docebo to search across learning management data including courses, learning plans, users, enrollments, and certifications. Uses OAuth 2.0 client credentials with page-based pagination.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Docebo",
  website: "https://www.docebo.com",

  searchDisplay: {
    defaultIconKey: "BookOpen",
    documentTypes: {
      course: {
        label: "course",
        iconKey: "BookOpen",
        category: "document",
      },
      learning_plan: {
        label: "learning plan",
        iconKey: "ClipboardList",
        category: "document",
      },
      user: {
        label: "user",
        iconKey: "User",
        category: "contact",
      },
      enrollment: {
        label: "enrollment",
        iconKey: "CheckCircle",
        category: "document",
      },
      certification: {
        label: "certification",
        iconKey: "Award",
        category: "document",
      },
    },
  },

  features: [
    "Course search with status, duration, and category filtering",
    "Learning plan indexing with course associations",
    "User directory with roles and enrollment data",
    "Enrollment tracking with completion status and progress",
    "Certification discovery with expiration dates",
    "OAuth 2.0 client credentials authentication",
    "Incremental sync via last_update filters",
  ],

  auth: {
    type: AuthType.API_KEY,
    config: {
      headerName: "Authorization",
      documentationUrl: "https://www.docebo.com/knowledge-base/apis/",
    },
  },

  streams: [
    {
      name: "courses",
      label: "Courses",
      description:
        "Training courses with content, duration, and enrollment details",
      entityType: "resource",
      dataPoints: [
        "Name",
        "Code",
        "Type",
        "Status",
        "Category",
        "Duration",
        "Language",
      ],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 30,
      supportsBackfill: true,
    },
    {
      name: "learning_plans",
      label: "Learning Plans",
      description: "Structured learning paths with course sequences",
      entityType: "resource",
      dataPoints: ["Name", "Status", "Course Count", "Duration", "Category"],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 30,
      supportsBackfill: true,
    },
    {
      name: "users",
      label: "Users",
      description: "Learner profiles with roles and enrollment data",
      entityType: "resource",
      dataPoints: [
        "Username",
        "Full Name",
        "Email",
        "Role",
        "Status",
        "Branch",
      ],
      isPii: true,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
    {
      name: "enrollments",
      label: "Enrollments",
      description:
        "User course enrollments with progress and completion status",
      entityType: "resource",
      dataPoints: [
        "User",
        "Course",
        "Status",
        "Progress",
        "Completion Date",
        "Score",
      ],
      isPii: true,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 30,
      supportsBackfill: true,
    },
    {
      name: "certifications",
      label: "Certifications",
      description: "Certifications with requirements and expiration tracking",
      entityType: "resource",
      dataPoints: ["Title", "Code", "Status", "Duration", "Expiration"],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "instance_url",
      label: "Instance URL",
      description:
        "Your Docebo instance URL (e.g., https://yourcompany.docebosaas.com).",
      type: "text",
      required: true,
      value: "",
      placeholder: "https://yourcompany.docebosaas.com",
    },
    {
      id: "client_id",
      label: "Client ID",
      description:
        "OAuth 2.0 client ID from Admin Menu > API and SSO > API Credentials.",
      type: "text",
      required: true,
      value: "",
      placeholder: "your-client-id",
    },
    {
      id: "client_secret",
      label: "Client Secret",
      description:
        "OAuth 2.0 client secret from the same API credentials page.",
      type: "password",
      required: true,
      value: "",
    },
    {
      id: "sync_courses",
      label: "Sync Courses",
      description: "Index training courses.",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "sync_learning_plans",
      label: "Sync Learning Plans",
      description: "Index learning plans.",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "sync_users",
      label: "Sync Users",
      description: "Index learner profiles.",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "sync_enrollments",
      label: "Sync Enrollments",
      description: "Index enrollment records.",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "sync_certifications",
      label: "Sync Certifications",
      description: "Index certifications.",
      type: "switch",
      required: false,
      value: true,
    },
  ],
};

export default doceboApp;
